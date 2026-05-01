"""DOCX template filling and preview generation for resume files."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
import tempfile
import uuid
import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Iterable, List
from xml.etree import ElementTree as ET

from PIL import Image


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml"
XML_NS = "http://www.w3.org/XML/1998/namespace"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
NS = {"w": WORD_NS}

ET.register_namespace("w", WORD_NS)


TEMPLATE_SLOTS = {
    "title": "3FB2BE98",
    "top_combined": "3110F959",
    "political": "7379ED6E",
    "email": "2D39A1E2",
    "phone": "773D6DEA",
    "education_title": "0F12EEAB",
    "education_header": "6A7A6590",
    "education_bullets": ["2375F9D9", "53A568C1"],
    "intern_title_bg": "0B0D0AC8",
    "intern_title_text": "2C01A735",
    "intern_header": "01A23FB4",
    "intern_bullets": ["5F754DA5", "5ECC350B", "50B392E1"],
    "project_title_bg": "4F0F8342",
    "project_title_text": "6650E97C",
    "project_header": "08DF85DC",
    "project_bullets": ["1557F8D5", "7D14AC76", "73D21EB7"],
    "campus_title_bg": "77A814BE",
    "campus_title_text": "041681FB",
    "campus_header": "5AA2C5A3",
    "campus_bullets": ["0098F6E4", "65B55CB6", "305207C4"],
    "award_title": "05F7BF67",
    "award_bullets": ["7311400B", "6057A9E0"],
    "skill_title": "4E08E9C5",
    "skill_bullets": ["606D80DD", "5DC78FB3", "3A760305"],
    "summary_title": "0296942E",
    "summary_bullets": ["7CA30768", "71E2B640", "3A53E2D0"],
}


@dataclass
class ResumeItem:
    title: str = ""
    role: str = ""
    organization: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    summary: str = ""
    bullets: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)


@dataclass
class ResumeFacts:
    name: str = ""
    email: str = ""
    phone: str = ""
    city: str = ""
    birth_date: str = ""
    gender: str = ""
    political_status: str = ""
    target_company: str = ""
    target_role: str = ""
    job_requirements: str = ""
    summary: str = ""
    education: List[ResumeItem] = field(default_factory=list)
    experience: List[ResumeItem] = field(default_factory=list)
    projects: List[ResumeItem] = field(default_factory=list)
    awards: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)


class ResumeDocxTemplateService:
    """Fill predefined DOCX resume templates while keeping template formatting."""

    def __init__(
        self,
        *,
        template_dir: Path,
        generated_dir: Path,
        preview_dir: Path,
        avatar_dir: Path,
        project_root: Path,
        soffice_path: str = "",
        preview_dpi: int = 180,
    ) -> None:
        self.project_root = project_root
        self.template_dir = self._resolve_project_path(template_dir)
        self.generated_dir = self._resolve_project_path(generated_dir)
        self.preview_dir = self._resolve_project_path(preview_dir)
        self.avatar_dir = self._resolve_project_path(avatar_dir)
        self.soffice_path = self._resolve_soffice_path(soffice_path)
        self.preview_dpi = max(96, min(int(preview_dpi or 180), 300))

        self.template_dir.mkdir(parents=True, exist_ok=True)
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        self.preview_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_project_path(self, path: Path) -> Path:
        if path.is_absolute():
            return path
        return (self.project_root / path).resolve()

    def _resolve_soffice_path(self, configured: str) -> str:
        configured = str(configured or "").strip()
        if configured:
            candidate = Path(configured)
            if not candidate.is_absolute():
                candidate = (self.project_root / candidate).resolve()
            if candidate.exists():
                return str(candidate)
        for candidate in (
            shutil.which("soffice"),
            shutil.which("libreoffice"),
            "C:/Program Files/LibreOffice/program/soffice.exe",
            "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
        ):
            if candidate and Path(candidate).exists():
                return str(candidate)
        return ""

    def _safe_child_path(self, base: Path, file_name: str) -> Path:
        candidate = (base / Path(file_name).name).resolve()
        if base.resolve() not in candidate.parents and candidate != base.resolve():
            raise FileNotFoundError("Requested file is outside the configured directory.")
        if not candidate.exists():
            raise FileNotFoundError("Requested file was not found.")
        return candidate

    def _catalog_path(self) -> Path:
        return self.template_dir / "catalog.json"

    @staticmethod
    def _public_url(route: str, file_name: str) -> str:
        return f"/api/{route}/{Path(file_name).name}"

    def list_templates(self) -> Dict[str, Any]:
        catalog_path = self._catalog_path()
        if not catalog_path.exists():
            return {"templates": [], "default_template_id": ""}

        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
        records = raw.get("templates") if isinstance(raw, dict) else raw
        templates: List[Dict[str, Any]] = []
        for record in records or []:
            if not isinstance(record, dict):
                continue
            template_id = str(record.get("id") or "").strip()
            docx_file_name = str(record.get("docx_file_name") or "").strip()
            preview_file_name = str(record.get("preview_file_name") or "").strip()
            if not template_id or not docx_file_name:
                continue
            templates.append(
                {
                    "id": template_id,
                    "name": str(record.get("name") or template_id),
                    "category": str(record.get("category") or ""),
                    "description": str(record.get("description") or ""),
                    "docx_file_name": Path(docx_file_name).name,
                    "preview_file_name": Path(preview_file_name).name if preview_file_name else "",
                    "style_tags": list(record.get("style_tags") or []),
                    "is_default": bool(record.get("is_default")),
                    "capacity": record.get("capacity") or {},
                    "preview_url": f"/api/resume/file/templates/{template_id}/preview",
                }
            )

        default_template = next((item for item in templates if item["is_default"]), templates[0] if templates else None)
        return {
            "templates": templates,
            "default_template_id": default_template["id"] if default_template else "",
        }

    def _find_template(self, template_id: str) -> Dict[str, Any]:
        templates = self.list_templates().get("templates") or []
        for template in templates:
            if template.get("id") == template_id:
                return template
        raise FileNotFoundError("Resume file template was not found.")

    def get_template_preview_path(self, template_id: str) -> Path:
        template = self._find_template(template_id)
        preview_name = template.get("preview_file_name") or template.get("docx_file_name")
        return self._safe_child_path(self.template_dir, preview_name)

    def get_generated_docx_path(self, file_name: str) -> Path:
        return self._safe_child_path(self.generated_dir, file_name)

    def get_generated_preview_path(self, file_name: str) -> Path:
        return self._safe_child_path(self.preview_dir, file_name)

    def generate_resume_file(
        self,
        *,
        resume_text: str,
        template_id: str,
        structured_resume: Dict[str, Any] | None = None,
        form_state: Dict[str, Any] | None = None,
        avatar_saved_name: str = "",
        board: str = "",
        file_name: str = "",
    ) -> Dict[str, Any]:
        cleaned_resume = (resume_text or "").strip()
        if not cleaned_resume:
            raise ValueError("Resume text is required before generating a file.")

        template = self._find_template(template_id)
        template_path = self._safe_child_path(self.template_dir, template["docx_file_name"])
        avatar_path = None
        if avatar_saved_name:
            avatar_path = self._safe_child_path(self.avatar_dir, avatar_saved_name)

        facts = self._extract_facts(
            resume_text=cleaned_resume,
            structured_resume=structured_resume or {},
            form_state=form_state or {},
        )
        capacity = template.get("capacity") or {}
        filled_docx, layout_report = self._fill_docx_template(template_path, facts, capacity, avatar_path)

        requested_stem = self._safe_stem(Path(file_name).stem) if file_name else ""
        auto_stem = self._safe_stem(
            f"{facts.name or 'resume'}-{facts.target_role or template_id}-{int(time.time())}-{uuid.uuid4().hex[:6]}"
        )
        stem = (
            f"{requested_stem}-{int(time.time())}-{uuid.uuid4().hex[:6]}"
            if requested_stem
            else auto_stem
        )
        docx_name = f"{stem}.docx"
        preview_name = f"{stem}.png"
        docx_path = self.generated_dir / docx_name
        preview_path = self.preview_dir / preview_name
        docx_path.write_bytes(filled_docx)
        preview_result = self._render_docx_preview(docx_path, preview_path)
        layout_report["preview"] = preview_result
        preview_ready = bool(preview_result.get("ok") and preview_path.exists())

        return {
            "kind": "docx_template",
            "file_name": docx_name,
            "saved_name": docx_name,
            "download_url": self._public_url("resume/file/generated", docx_name),
            "preview_name": preview_name if preview_ready else "",
            "preview_url": self._public_url("resume/file/preview", preview_name) if preview_ready else "",
            "template_id": template_id,
            "template_name": template.get("name") or template_id,
            "board": board,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "layout_report": layout_report,
        }

    def _fill_docx_template(
        self,
        template_path: Path,
        facts: ResumeFacts,
        capacity: Dict[str, Any],
        avatar_path: Path | None,
    ) -> tuple[bytes, Dict[str, Any]]:
        layout_report: Dict[str, Any] = {
            "mode": "docx_template",
            "passed": True,
            "changed_scope": "按模板槽位替换文字和头像，保留字号、加粗、颜色、段落对象和页面结构。",
            "bullets_per_item": int(capacity.get("bullets_per_item") or 3),
            "fixed_issues": [],
            "warnings": [],
            "overflow_notes": [],
            "selected_records": [],
            "omitted_records": [],
            "template_diff": [],
            "font_normalized": False,
            "comments_removed": False,
        }
        with zipfile.ZipFile(template_path, "r") as source_zip:
            document_xml = source_zip.read("word/document.xml")
            root = ET.fromstring(document_xml)
            paragraphs = root.findall(".//w:p", NS)
            remove_indices: set[int] = set()

            self._apply_template_slots(paragraphs, facts, capacity, layout_report, remove_indices)
            self._remove_paragraphs(root, remove_indices)
            self._strip_review_markup(root, layout_report)
            layout_report["font_normalized"] = self._normalize_document_fonts(root)
            if layout_report["font_normalized"]:
                layout_report["fixed_issues"].append("已将正文中文字体规范为宋体，英文和数字规范为 Times New Roman。")
            self._audit_document(root, layout_report)

            document_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            avatar_bytes = self._build_avatar_media(avatar_path) if avatar_path else None

            output = BytesIO()
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
                for item in source_zip.infolist():
                    if self._is_comment_or_revision_part(item.filename):
                        layout_report["comments_removed"] = True
                        continue
                    if item.filename == "word/document.xml":
                        target_zip.writestr(item, document_bytes)
                    elif avatar_bytes and item.filename == "word/media/image1.png":
                        target_zip.writestr(item, avatar_bytes)
                    elif item.filename == "word/_rels/document.xml.rels":
                        target_zip.writestr(item, self._clean_document_relationships(source_zip.read(item.filename), layout_report))
                    elif item.filename == "word/styles.xml":
                        target_zip.writestr(item, self._normalize_styles_xml_fonts(source_zip.read(item.filename)))
                    elif item.filename == "[Content_Types].xml":
                        target_zip.writestr(item, self._clean_content_types(source_zip.read(item.filename), layout_report))
                    else:
                        target_zip.writestr(item, source_zip.read(item.filename))

        layout_report["passed"] = not layout_report["warnings"]
        return output.getvalue(), layout_report

    def _apply_template_slots(
        self,
        paragraphs: List[ET.Element],
        facts: ResumeFacts,
        capacity: Dict[str, Any],
        layout_report: Dict[str, Any],
        remove_indices: set[int],
    ) -> None:
        bullets_per_item = int(capacity.get("bullets_per_item") or 3)
        max_bullet_chars = int(capacity.get("max_bullet_chars") or 42)
        layout_notes: List[str] = layout_report["overflow_notes"]
        by_id = self._paragraphs_by_id(paragraphs)

        def set_id(slot: str, text: str, *, bullet: bool = False, occurrence: int | None = None) -> None:
            ids = TEMPLATE_SLOTS[slot]
            slot_ids = ids if isinstance(ids, list) else [ids]
            for para_id in slot_ids:
                targets = by_id.get(para_id, [])
                if occurrence is not None:
                    targets = targets[occurrence : occurrence + 1]
                for paragraph_index, paragraph in targets:
                    self._set_paragraph_text(
                        paragraph,
                        text,
                        keep_bullet=bullet and bool(str(text or "").strip()),
                        preserve_text=True,
                    )

        def set_para_id(para_id: str, text: str, *, bullet: bool = False, occurrence: int | None = None) -> None:
            targets = by_id.get(para_id, [])
            if occurrence is not None:
                targets = targets[occurrence : occurrence + 1]
            for _paragraph_index, paragraph in targets:
                self._set_paragraph_text(
                    paragraph,
                    text,
                    keep_bullet=bullet and bool(str(text or "").strip()),
                    preserve_text=True,
                )

        def remove_id(slot_or_id: str, *, occurrence: int | None = None) -> None:
            ids = TEMPLATE_SLOTS.get(slot_or_id, slot_or_id)
            slot_ids = ids if isinstance(ids, list) else [ids]
            for para_id in slot_ids:
                targets = by_id.get(para_id, [])
                if occurrence is not None:
                    targets = targets[occurrence : occurrence + 1]
                for paragraph_index, _paragraph in targets:
                    remove_indices.add(paragraph_index)

        def fill_bullet_ids(slot: str, item: ResumeItem, *, max_slots: int = 3) -> None:
            bullets = self._limited_bullets(item, max_slots, max_bullet_chars, layout_notes)
            for para_id, value in zip(TEMPLATE_SLOTS[slot], bullets):
                if value:
                    set_para_id(para_id, value, bullet=True)
                else:
                    remove_id(para_id)

        def fill_record(header_slot: str, bullet_slot: str, item: ResumeItem) -> None:
            set_id(header_slot, self._item_header(item))
            fill_bullet_ids(bullet_slot, item, max_slots=bullets_per_item)

        education = facts.education[0] if facts.education else ResumeItem()
        selected_records, omitted_records = self._select_template_records(facts, capacity)
        skills = self._normalize_skill_lines(facts.skills)
        summary_lines = self._split_summary(facts.summary)
        layout_report["selected_records"] = [self._record_label(kind, item) for kind, item in selected_records]
        layout_report["omitted_records"] = [self._record_label(kind, item) for kind, item in omitted_records]
        if omitted_records:
            layout_notes.append(f"一页容量最多放入 3 条实习/项目/荣誉，已省略 {len(omitted_records)} 条低优先级内容。")

        set_id("title", "",)
        self._set_title_parts(by_id, facts)
        set_id("top_combined", self._join_nonempty([
            f"政治面貌：{facts.political_status}" if facts.political_status else "",
            f"邮箱：{facts.email}" if facts.email else "",
            f"出生年月：{facts.birth_date}" if facts.birth_date else "",
        ], "        "))
        set_id("political", f"政治面貌：{facts.political_status}" if facts.political_status else f"城市：{facts.city}" if facts.city else "")
        set_id("email", f"邮箱：{facts.email}" if facts.email else "")
        set_id("phone", f"联系电话：{facts.phone}" if facts.phone else "")

        if facts.education:
            set_id("education_title", "    教育背景")
            set_id("education_header", self._education_header(education))
            edu_highlights = education.bullets or []
            for offset, para_id in enumerate(TEMPLATE_SLOTS["education_bullets"]):
                if offset < len(edu_highlights) and edu_highlights[offset]:
                    set_para_id(para_id, self._compact_text(edu_highlights[offset], max_bullet_chars, layout_notes), bullet=True)
                else:
                    remove_id(para_id)
        else:
            remove_id("education_title")
            remove_id("education_header")
            remove_id("education_bullets")

        experience_records = [item for kind, item in selected_records if kind == "experience"]
        project_records = [item for kind, item in selected_records if kind == "project"]
        award_records = [item for kind, item in selected_records if kind == "award"]

        first_formal_project_in_intern_slot = False
        if experience_records:
            set_id("intern_title_bg", "    实习经历")
            set_id("intern_title_text", "    实习经历")
            fill_record("intern_header", "intern_bullets", experience_records[0])
        elif project_records:
            first_formal_project_in_intern_slot = True
            set_id("intern_title_bg", "    项目经历")
            set_id("intern_title_text", "    项目经历")
            fill_record("intern_header", "intern_bullets", project_records[0])
            project_records = project_records[1:]
        else:
            remove_id("intern_title_bg")
            remove_id("intern_title_text")
            remove_id("intern_header")
            remove_id("intern_bullets")

        if project_records:
            if first_formal_project_in_intern_slot:
                remove_id("project_title_bg")
                remove_id("project_title_text")
            else:
                set_id("project_title_bg", "    项目经历")
                set_id("project_title_text", "    项目经历", occurrence=0)
                remove_id("project_title_text", occurrence=1)
            fill_record("project_header", "project_bullets", project_records[0])
        else:
            remove_id("project_title_bg")
            remove_id("project_title_text")
            remove_id("project_header")
            remove_id("project_bullets")

        if len(project_records) > 1:
            remove_id("campus_title_bg")
            remove_id("campus_title_text")
            fill_record("campus_header", "campus_bullets", project_records[1])
        else:
            remove_id("campus_title_bg")
            remove_id("campus_title_text")
            remove_id("campus_header")
            remove_id("campus_bullets")

        if award_records:
            award_lines = [self._compact_text(item.summary or item.title, 46, layout_notes) for item in award_records[:2]]
            set_id("award_title", "荣誉奖励")
            for offset, para_id in enumerate(TEMPLATE_SLOTS["award_bullets"]):
                if offset < len(award_lines) and award_lines[offset]:
                    set_para_id(para_id, award_lines[offset], bullet=True)
                else:
                    remove_id(para_id)
        else:
            remove_id("award_title")
            remove_id("award_bullets")

        if skills:
            set_id("skill_title", "技能证书")
            for offset, para_id in enumerate(TEMPLATE_SLOTS["skill_bullets"]):
                if offset < len(skills):
                    set_para_id(para_id, self._skill_line(skills, offset, ""), bullet=True)
                else:
                    remove_id(para_id)
        else:
            remove_id("skill_title")
            remove_id("skill_bullets")

        if summary_lines:
            set_id("summary_title", "自我评价")
            for offset, para_id in enumerate(TEMPLATE_SLOTS["summary_bullets"]):
                if offset < len(summary_lines):
                    set_para_id(para_id, summary_lines[offset], bullet=True)
                else:
                    remove_id(para_id)
        else:
            remove_id("summary_title")
            remove_id("summary_bullets")

        layout_report["template_diff"].extend(
            [
                "已替换姓名、联系方式、目标岗位、教育、经历、技能和总结文本。",
                "已按模板容量选择最多 3 条实习/项目/荣誉记录。",
                "未修改字号、加粗、颜色、页面边距、图标和分割线对象。",
            ]
        )

    @staticmethod
    def _paragraph_id(paragraph: ET.Element) -> str:
        return paragraph.attrib.get(f"{{{W14_NS}}}paraId", "")

    def _paragraphs_by_id(self, paragraphs: List[ET.Element]) -> Dict[str, List[tuple[int, ET.Element]]]:
        grouped: Dict[str, List[tuple[int, ET.Element]]] = {}
        for index, paragraph in enumerate(paragraphs):
            para_id = self._paragraph_id(paragraph)
            if para_id:
                grouped.setdefault(para_id, []).append((index, paragraph))
        return grouped

    def _set_title_parts(self, by_id: Dict[str, List[tuple[int, ET.Element]]], facts: ResumeFacts) -> None:
        for _index, paragraph in by_id.get(TEMPLATE_SLOTS["title"], []):
            run_nodes = self._direct_text_run_nodes(paragraph)
            text_nodes = [node for _run, node in run_nodes]
            if not text_nodes:
                continue
            for node in text_nodes:
                node.text = ""
                node.attrib.pop(f"{{{XML_NS}}}space", None)
            text_nodes[0].text = facts.name or "姓名"
            if len(text_nodes) >= 2:
                text_nodes[1].text = "         "
                text_nodes[1].set(f"{{{XML_NS}}}space", "preserve")
            text_nodes[-1].text = f"意向岗位：{facts.target_role or '目标岗位'}"

    def _select_template_records(
        self,
        facts: ResumeFacts,
        capacity: Dict[str, Any],
    ) -> tuple[List[tuple[str, ResumeItem]], List[tuple[str, ResumeItem]]]:
        max_records = int(capacity.get("career_record_limit") or 3)
        buckets: Dict[str, List[ResumeItem]] = {
            "experience": facts.experience,
            "project": facts.projects,
            "award": [ResumeItem(title=item, summary=item) for item in facts.awards],
        }
        ranked = {
            kind: sorted(items, key=lambda item: self._record_score(item, facts), reverse=True)
            for kind, items in buckets.items()
        }
        selected: List[tuple[str, ResumeItem]] = []
        omitted: List[tuple[str, ResumeItem]] = []
        for kind in ("experience", "project", "award"):
            if ranked[kind] and len(selected) < max_records:
                selected.append((kind, ranked[kind][0]))
        leftovers: List[tuple[str, ResumeItem]] = []
        for kind in ("project", "experience", "award"):
            leftovers.extend((kind, item) for item in ranked[kind][1:])
        for kind, item in sorted(leftovers, key=lambda pair: self._record_score(pair[1], facts), reverse=True):
            if len(selected) < max_records:
                selected.append((kind, item))
            else:
                omitted.append((kind, item))
        selected_ids = {id(item) for _kind, item in selected}
        for kind, items in buckets.items():
            for item in items:
                if id(item) not in selected_ids and not any(id(item) == id(existing) for _k, existing in omitted):
                    omitted.append((kind, item))
        return selected, omitted

    def _record_score(self, item: ResumeItem, facts: ResumeFacts) -> int:
        haystack = " ".join(
            [
                item.title,
                item.role,
                item.organization,
                item.summary,
                " ".join(item.bullets),
                " ".join(item.tools),
            ]
        ).lower()
        keywords = [
            token.lower()
            for token in re.split(r"[\s,，/、；;|｜]+", f"{facts.target_role} {facts.job_requirements} {' '.join(facts.skills)}")
            if token.strip()
        ]
        score = len(haystack)
        score += min(80, len([bullet for bullet in item.bullets if bullet]) * 20)
        score += min(40, len([tool for tool in item.tools if tool]) * 8)
        score += sum(18 for token in keywords[:16] if token and token in haystack)
        if re.search(r"\d", haystack):
            score += 30
        return score

    @staticmethod
    def _record_label(kind: str, item: ResumeItem) -> Dict[str, str]:
        labels = {"experience": "实习/工作", "project": "项目", "award": "荣誉"}
        return {
            "kind": kind,
            "label": labels.get(kind, kind),
            "title": item.title or item.organization or item.summary or "未命名记录",
        }

    @staticmethod
    def _has_item_content(item: ResumeItem) -> bool:
        return any(
            [
                item.title.strip(),
                item.role.strip(),
                item.organization.strip(),
                item.location.strip(),
                item.start_date.strip(),
                item.end_date.strip(),
                item.summary.strip(),
                any(str(value or "").strip() for value in item.bullets),
                any(str(value or "").strip() for value in item.tools),
            ]
        )

    def _direct_text_nodes(self, paragraph: ET.Element) -> List[ET.Element]:
        nodes: List[ET.Element] = []
        for run in paragraph.findall("w:r", NS):
            nodes.extend(run.findall("w:t", NS))
        return nodes

    def _direct_text_run_nodes(self, paragraph: ET.Element) -> List[tuple[ET.Element, ET.Element]]:
        pairs: List[tuple[ET.Element, ET.Element]] = []
        for run in paragraph.findall("w:r", NS):
            for node in run.findall("w:t", NS):
                pairs.append((run, node))
        return pairs

    @staticmethod
    def _is_symbol_run(run: ET.Element) -> bool:
        rpr = run.find("w:rPr", NS)
        if rpr is None:
            return False
        fonts = rpr.find("w:rFonts", NS)
        if fonts is None:
            return False
        return any(str(value).lower() == "wingdings" for value in fonts.attrib.values())

    def _set_paragraph_text(
        self,
        paragraph: ET.Element,
        text: str,
        *,
        keep_bullet: bool = False,
        parts: List[str] | None = None,
        preserve_text: bool = False,
    ) -> None:
        run_nodes = self._direct_text_run_nodes(paragraph)
        direct_text_nodes = [node for _, node in run_nodes]
        all_text_nodes = paragraph.findall(".//w:t", NS)
        text_nodes = direct_text_nodes if direct_text_nodes and len(direct_text_nodes) == len(all_text_nodes) else all_text_nodes
        if not text_nodes:
            return

        for node in text_nodes:
            node.text = ""
            node.attrib.pop(f"{{{XML_NS}}}space", None)

        if parts:
            cleaned_parts = [str(part or "") if preserve_text else str(part or "").strip() for part in parts]
            if len(cleaned_parts) == 1:
                text_nodes[0].text = cleaned_parts[0]
            else:
                text_nodes[0].text = cleaned_parts[0]
                if len(text_nodes) >= 3:
                    text_nodes[1].text = "         "
                    text_nodes[1].set(f"{{{XML_NS}}}space", "preserve")
                text_nodes[-1].text = cleaned_parts[-1]
            for node in (text_nodes[0], text_nodes[-1]):
                if node.text and (node.text.startswith(" ") or node.text.endswith(" ")):
                    node.set(f"{{{XML_NS}}}space", "preserve")
            return

        normalized = str(text or "") if preserve_text else str(text or "").strip()
        if keep_bullet and len(run_nodes) >= 2:
            bullet_node = run_nodes[0][1]
            content_node = next(
                (node for run, node in run_nodes[1:] if not self._is_symbol_run(run)),
                run_nodes[-1][1],
            )
            bullet_node.text = "l "
            content_node.text = normalized
            return

        text_nodes[0].text = normalized
        if normalized.startswith(" ") or normalized.endswith(" "):
            text_nodes[0].set(f"{{{XML_NS}}}space", "preserve")

    def _education_header(self, item: ResumeItem) -> str:
        return self._join_nonempty(
            [
                self._date_range(item),
                item.organization,
                item.title,
                item.role,
            ],
            "      ",
        )

    def _remove_paragraphs(self, root: ET.Element, indices: set[int]) -> None:
        if not indices:
            return
        parent_map = {child: parent for parent in root.iter() for child in parent}
        paragraphs = root.findall(".//w:p", NS)
        for index in sorted(indices, reverse=True):
            paragraph = paragraphs[index]
            parent = parent_map.get(paragraph)
            if parent is not None:
                parent.remove(paragraph)

    def _build_avatar_media(self, avatar_path: Path | None) -> bytes | None:
        if not avatar_path:
            return None
        with Image.open(avatar_path) as image:
            image = image.convert("RGB")
            target_width, target_height = 115, 134
            source_ratio = image.width / max(1, image.height)
            target_ratio = target_width / target_height
            if source_ratio > target_ratio:
                new_width = int(image.height * target_ratio)
                left = max(0, (image.width - new_width) // 2)
                image = image.crop((left, 0, left + new_width, image.height))
            else:
                new_height = int(image.width / target_ratio)
                top = max(0, (image.height - new_height) // 2)
                image = image.crop((0, top, image.width, top + new_height))
            image = image.resize((target_width, target_height), Image.LANCZOS)
            output = BytesIO()
            image.save(output, format="PNG")
            return output.getvalue()

    def _render_docx_preview(self, docx_path: Path, preview_path: Path) -> Dict[str, Any]:
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="resume_docx_preview_") as temp_name:
            temp_dir = Path(temp_name)
            pdf_path = temp_dir / f"{docx_path.stem}.pdf"
            renderer = self._convert_docx_to_pdf(docx_path, pdf_path, temp_dir)
            if not renderer.get("ok"):
                return renderer
            try:
                import fitz  # type: ignore

                document = fitz.open(str(pdf_path))
                if document.page_count < 1:
                    return {
                        "ok": False,
                        "renderer": renderer.get("renderer", ""),
                        "message": "DOCX 已生成，但 PDF 中没有可渲染页面。",
                    }
                page = document.load_page(0)
                matrix = fitz.Matrix(self.preview_dpi / 72, self.preview_dpi / 72)
                pixmap = page.get_pixmap(matrix=matrix, alpha=False)
                pixmap.save(str(preview_path))
                document.close()
                return {
                    "ok": True,
                    "renderer": renderer.get("renderer", ""),
                    "message": "已从生成后的 Word 文件渲染高清图片预览。",
                    "dpi": self.preview_dpi,
                }
            except Exception as exc:
                return {
                    "ok": False,
                    "renderer": renderer.get("renderer", ""),
                    "message": f"DOCX 已生成，但预览渲染失败：{exc}",
                }

    def _convert_docx_to_pdf(self, docx_path: Path, pdf_path: Path, temp_dir: Path) -> Dict[str, Any]:
        if self.soffice_path:
            result = self._convert_with_soffice(docx_path, pdf_path, temp_dir)
            if result.get("ok"):
                return result
        result = self._convert_with_word_com(docx_path, pdf_path, temp_dir)
        if result.get("ok"):
            return result
        if self.soffice_path:
            return result
        if result.get("renderer") == "microsoft_word":
            return result
        return {
            "ok": False,
            "renderer": "none",
            "message": "DOCX 已生成，但未找到可用的 Word/LibreOffice 渲染器，无法生成图片预览。可安装 LibreOffice 或配置 SOFFICE_PATH。",
        }

    def _convert_with_soffice(self, docx_path: Path, pdf_path: Path, temp_dir: Path) -> Dict[str, Any]:
        try:
            command = [
                self.soffice_path,
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(temp_dir),
                str(docx_path),
            ]
            completed = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=60,
                check=False,
            )
            generated_pdf = temp_dir / f"{docx_path.stem}.pdf"
            if completed.returncode == 0 and generated_pdf.exists():
                if generated_pdf.resolve() != pdf_path.resolve():
                    shutil.copyfile(generated_pdf, pdf_path)
                return {"ok": True, "renderer": "libreoffice", "message": "LibreOffice 渲染成功。"}
            return {
                "ok": False,
                "renderer": "libreoffice",
                "message": f"LibreOffice 渲染失败：{(completed.stderr or completed.stdout).strip()[:220]}",
            }
        except Exception as exc:
            return {"ok": False, "renderer": "libreoffice", "message": f"LibreOffice 渲染失败：{exc}"}

    def _convert_with_word_com(self, docx_path: Path, pdf_path: Path, temp_dir: Path) -> Dict[str, Any]:
        powershell = shutil.which("powershell") or shutil.which("powershell.exe")
        if not powershell:
            return {"ok": False, "renderer": "microsoft_word", "message": "未找到 PowerShell，无法调用本机 Word 渲染。"}
        script_path = temp_dir / "render_docx.ps1"
        script_path.write_text(
            """
param(
  [string]$DocxPath,
  [string]$PdfPath
)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($DocxPath, $false, $true)
  try {
    $doc.ExportAsFixedFormat($PdfPath, 17)
  } finally {
    $doc.Close($false)
  }
} finally {
  $word.Quit()
}
""".strip(),
            encoding="utf-8",
        )
        try:
            completed = subprocess.run(
                [
                    powershell,
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(script_path),
                    "-DocxPath",
                    str(docx_path),
                    "-PdfPath",
                    str(pdf_path),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=90,
                check=False,
            )
            if completed.returncode == 0 and pdf_path.exists():
                return {"ok": True, "renderer": "microsoft_word", "message": "Microsoft Word 渲染成功。"}
            return {
                "ok": False,
                "renderer": "microsoft_word",
                "message": f"Microsoft Word 渲染失败：{(completed.stderr or completed.stdout).strip()[:220]}",
            }
        except Exception as exc:
            return {"ok": False, "renderer": "microsoft_word", "message": f"Microsoft Word 渲染失败：{exc}"}

    def _strip_review_markup(self, root: ET.Element, layout_report: Dict[str, Any]) -> None:
        review_tags = {
            f"{{{WORD_NS}}}commentRangeStart",
            f"{{{WORD_NS}}}commentRangeEnd",
            f"{{{WORD_NS}}}commentReference",
            f"{{{WORD_NS}}}proofErr",
            f"{{{WORD_NS}}}permStart",
            f"{{{WORD_NS}}}permEnd",
        }
        wrapper_tags = {f"{{{WORD_NS}}}ins"}
        delete_tags = {f"{{{WORD_NS}}}del", f"{{{WORD_NS}}}moveFrom", f"{{{WORD_NS}}}moveTo"}
        changed = False
        for parent in list(root.iter()):
            children = list(parent)
            for index, child in enumerate(children):
                if child.tag in review_tags or child.tag in delete_tags:
                    parent.remove(child)
                    changed = True
                elif child.tag in wrapper_tags:
                    parent.remove(child)
                    for offset, grandchild in enumerate(list(child)):
                        parent.insert(index + offset, grandchild)
                    changed = True
        if changed:
            layout_report["comments_removed"] = True
            layout_report["fixed_issues"].append("已清理模板中的批注、修订和校对痕迹。")

    def _normalize_document_fonts(self, root: ET.Element) -> bool:
        changed = False
        for run in root.findall(".//w:r", NS):
            if self._is_symbol_run(run):
                continue
            rpr = run.find("w:rPr", NS)
            if rpr is None:
                rpr = ET.Element(f"{{{WORD_NS}}}rPr")
                run.insert(0, rpr)
                changed = True
            fonts = rpr.find("w:rFonts", NS)
            if fonts is None:
                fonts = ET.Element(f"{{{WORD_NS}}}rFonts")
                rpr.insert(0, fonts)
                changed = True
            expected = {
                f"{{{WORD_NS}}}eastAsia": "宋体",
                f"{{{WORD_NS}}}ascii": "Times New Roman",
                f"{{{WORD_NS}}}hAnsi": "Times New Roman",
                f"{{{WORD_NS}}}cs": "Times New Roman",
            }
            for key, value in expected.items():
                if fonts.attrib.get(key) != value:
                    fonts.set(key, value)
                    changed = True
        return changed

    def _normalize_styles_xml_fonts(self, data: bytes) -> bytes:
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            return data
        changed = False
        for fonts in root.findall(".//w:rFonts", NS):
            expected = {
                f"{{{WORD_NS}}}eastAsia": "宋体",
                f"{{{WORD_NS}}}ascii": "Times New Roman",
                f"{{{WORD_NS}}}hAnsi": "Times New Roman",
                f"{{{WORD_NS}}}cs": "Times New Roman",
            }
            for key, value in expected.items():
                if fonts.attrib.get(key) != value:
                    fonts.set(key, value)
                    changed = True
        return ET.tostring(root, encoding="utf-8", xml_declaration=True) if changed else data

    def _audit_document(self, root: ET.Element, layout_report: Dict[str, Any]) -> None:
        visible_paragraphs = [
            paragraph
            for paragraph in root.findall(".//w:p", NS)
            if not paragraph.findall(".//w:p", NS)
        ]
        body_text = "\n".join(
            "".join(node.text or "" for node in paragraph.findall(".//w:t", NS)).strip()
            for paragraph in visible_paragraphs
        )
        hard_errors = []
        if re.search(r"项目经历\s*项目经历", body_text) or re.search(r"实习经历\s*实习经历", body_text):
            hard_errors.append("检测到重复模块标题，需要重新生成。")
        if len(layout_report.get("selected_records") or []) > 3:
            hard_errors.append("入版经历超过 3 条，不符合一页模板容量限制。")
        if hard_errors:
            layout_report["warnings"].extend(hard_errors)
        else:
            layout_report["fixed_issues"].append("本地版式审查通过：模块标题、入版条数和空板块删除规则符合当前模板。")

    @staticmethod
    def _is_comment_or_revision_part(file_name: str) -> bool:
        lowered = file_name.lower()
        return any(
            marker in lowered
            for marker in (
                "comments.xml",
                "commentsextended.xml",
                "commentids.xml",
                "commentsids.xml",
                "people.xml",
                "numberingchanges",
            )
        )

    def _clean_document_relationships(self, data: bytes, layout_report: Dict[str, Any]) -> bytes:
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            return data
        changed = False
        for child in list(root):
            relation_type = str(child.attrib.get("Type") or "").lower()
            target = str(child.attrib.get("Target") or "").lower()
            if "comment" in relation_type or "comment" in target or "people" in relation_type or "people" in target:
                root.remove(child)
                changed = True
        if changed:
            layout_report["comments_removed"] = True
        return ET.tostring(root, encoding="utf-8", xml_declaration=True) if changed else data

    def _clean_content_types(self, data: bytes, layout_report: Dict[str, Any]) -> bytes:
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            return data
        changed = False
        for child in list(root):
            part_name = str(child.attrib.get("PartName") or "").lower()
            content_type = str(child.attrib.get("ContentType") or "").lower()
            if "comment" in part_name or "comment" in content_type or "people" in part_name or "people" in content_type:
                root.remove(child)
                changed = True
        if changed:
            layout_report["comments_removed"] = True
        return ET.tostring(root, encoding="utf-8", xml_declaration=True) if changed else data

    def _extract_facts(
        self,
        *,
        resume_text: str,
        structured_resume: Dict[str, Any],
        form_state: Dict[str, Any],
    ) -> ResumeFacts:
        sections = self._parse_markdown_sections(resume_text)
        labeled_info = self._extract_labeled_info(resume_text)
        title_name, title_role = self._extract_title_parts(resume_text)
        basic_info = self._pick_basic_info(form_state)
        contact = structured_resume.get("contact") or {}

        facts = ResumeFacts(
            name=self._first_text(contact.get("full_name"), contact.get("name"), basic_info.get("name"), labeled_info.get("姓名"), title_name),
            email=self._first_text(contact.get("email"), basic_info.get("email"), labeled_info.get("邮箱")),
            phone=self._first_text(contact.get("phone"), basic_info.get("phone"), labeled_info.get("电话"), labeled_info.get("手机")),
            city=self._first_text(contact.get("city"), basic_info.get("city"), labeled_info.get("城市")),
            birth_date=self._first_text(contact.get("birth_date"), basic_info.get("birth_date"), labeled_info.get("出生年月")),
            gender=self._first_text(contact.get("gender"), basic_info.get("gender"), labeled_info.get("性别")),
            political_status=self._first_text(contact.get("political_status"), basic_info.get("political_status"), labeled_info.get("政治面貌")),
            target_company=self._first_text(contact.get("target_company"), basic_info.get("target_company"), form_state.get("target_company"), labeled_info.get("目标公司")),
            target_role=self._first_text(contact.get("target_role"), basic_info.get("target_role"), form_state.get("target_role"), labeled_info.get("目标岗位"), labeled_info.get("意向岗位"), title_role),
            job_requirements=self._first_text(basic_info.get("job_requirements"), form_state.get("job_requirements"), structured_resume.get("job_requirements")),
            summary=self._first_text(structured_resume.get("summary"), basic_info.get("summary"), sections.get("个人总结"), sections.get("个人摘要")),
        )
        facts.name = facts.name or self._deep_find_text(structured_resume, form_state, keys={"full_name", "name", "姓名"})
        facts.email = facts.email or self._deep_find_text(structured_resume, form_state, keys={"email", "邮箱"})
        facts.phone = facts.phone or self._deep_find_text(structured_resume, form_state, keys={"phone", "电话", "手机"})
        facts.target_company = facts.target_company or self._deep_find_text(
            structured_resume,
            form_state,
            keys={"target_company", "目标公司"},
        )
        facts.target_role = facts.target_role or self._deep_find_text(
            structured_resume,
            form_state,
            keys={"target_role", "job_title", "目标岗位", "意向岗位"},
        )
        facts.education = [item for item in self._extract_education(structured_resume, form_state, sections) if self._has_item_content(item)]
        facts.experience = [item for item in self._extract_experience(structured_resume, form_state, sections) if self._has_item_content(item)]
        facts.projects = [item for item in self._extract_projects(structured_resume, form_state, sections) if self._has_item_content(item)]
        facts.awards = self._extract_awards(structured_resume, form_state, sections)
        facts.skills = self._extract_skills(structured_resume, form_state, sections)
        return facts

    def _extract_education(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[ResumeItem]:
        records = []
        for item in structured.get("education") or []:
            highlights = self._string_list(item.get("highlights"))
            if item.get("gpa"):
                highlights.insert(0, f"GPA：{item.get('gpa')}")
            if item.get("ranking"):
                highlights.append(f"排名：{item.get('ranking')}")
            courses = self._string_list(item.get("courses"))
            if courses:
                highlights.append(f"主修课程：{' / '.join(courses)}")
            records.append(
                ResumeItem(
                    title=str(item.get("major") or ""),
                    role=str(item.get("degree") or ""),
                    organization=str(item.get("school_name") or item.get("school") or ""),
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    bullets=highlights,
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        for item in form_state.get("education") or []:
            highlights = self._split_lines(item.get("highlights_text"))
            if item.get("gpa"):
                highlights.insert(0, f"GPA：{item.get('gpa')}")
            if item.get("ranking"):
                highlights.append(f"排名：{item.get('ranking')}")
            courses = self._split_lines(item.get("courses_text")) or self._string_list(item.get("courses"))
            if courses:
                highlights.append(f"主修课程：{' / '.join(courses)}")
            records.append(
                ResumeItem(
                    title=str(item.get("major") or ""),
                    role=str(item.get("degree") or ""),
                    organization=str(item.get("school") or ""),
                    start_date=str(item.get("start_date") or self._split_duration(item.get("duration"))[0]),
                    end_date=str(item.get("end_date") or self._split_duration(item.get("duration"))[1]),
                    bullets=highlights,
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        return self._items_from_section(sections.get("教育背景") or sections.get("教育经历") or sections.get("教育") or "", default_title="教育")

    def _extract_experience(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[ResumeItem]:
        records = []
        for item in structured.get("experience") or structured.get("experiences") or []:
            records.append(
                ResumeItem(
                    organization=str(item.get("company_name") or item.get("company") or ""),
                    role=str(item.get("job_title") or item.get("role") or ""),
                    location=str(item.get("location") or item.get("department") or ""),
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    summary=str(item.get("role_scope") or item.get("summary") or ""),
                    bullets=self._string_list(item.get("achievements") or item.get("highlights")),
                    tools=self._string_list(item.get("tools")),
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        for item in form_state.get("experiences") or []:
            records.append(
                ResumeItem(
                    organization=str(item.get("company") or ""),
                    role=str(item.get("role") or ""),
                    location=str(item.get("location") or item.get("department") or ""),
                    start_date=str(item.get("start_date") or self._split_duration(item.get("duration"))[0]),
                    end_date=str(item.get("end_date") or self._split_duration(item.get("duration"))[1]),
                    summary=str(item.get("summary") or ""),
                    bullets=self._split_lines(item.get("highlights_text")),
                    tools=self._split_lines(item.get("tools_text")) or self._string_list(item.get("tools")),
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        return self._items_from_section(sections.get("实习经历") or sections.get("工作经历") or sections.get("实习/工作经历") or "", default_title="实习经历")

    def _extract_projects(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[ResumeItem]:
        records = []
        for item in structured.get("projects") or []:
            tools = self._string_list(item.get("tools"))
            project_url = str(item.get("project_url") or item.get("link") or "").strip()
            if project_url:
                tools.append(f"证明链接：{project_url}")
            records.append(
                ResumeItem(
                    title=str(item.get("project_name") or item.get("name") or ""),
                    role=str(item.get("role") or ""),
                    location=str(item.get("location") or ""),
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    summary=str(item.get("project_summary") or item.get("description") or ""),
                    bullets=self._string_list(item.get("achievements") or item.get("highlights")),
                    tools=tools,
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        for item in form_state.get("projects") or []:
            tools = self._split_lines(item.get("tools_text")) or self._string_list(item.get("tools"))
            project_url = str(item.get("project_url") or item.get("link") or "").strip()
            if project_url:
                tools.append(f"证明链接：{project_url}")
            records.append(
                ResumeItem(
                    title=str(item.get("name") or ""),
                    role=str(item.get("role") or ""),
                    location=str(item.get("location") or ""),
                    start_date=str(item.get("start_date") or self._split_duration(item.get("duration"))[0]),
                    end_date=str(item.get("end_date") or self._split_duration(item.get("duration"))[1]),
                    summary=str(item.get("description") or ""),
                    bullets=self._split_lines(item.get("highlights_text")),
                    tools=tools,
                )
            )
        records = [item for item in records if self._has_item_content(item)]
        if records:
            return records
        return self._items_from_section(sections.get("项目经历") or "", default_title="项目经历")

    def _extract_awards(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[str]:
        awards = []
        for item in structured.get("awards") or []:
            awards.append(self._join_nonempty([item.get("date"), item.get("issuer"), item.get("award_name"), item.get("level")], " "))
        for item in form_state.get("awards") or []:
            awards.append(self._join_nonempty([item.get("date"), item.get("issuer"), item.get("award_name"), item.get("level")], " "))
        awards.extend(self._split_lines(sections.get("获奖情况") or sections.get("荣誉奖励") or ""))
        return [item for item in self._dedupe(awards) if item]

    def _extract_skills(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[str]:
        skills = []
        for item in structured.get("skills") or []:
            if isinstance(item, dict):
                skills.append(self._join_nonempty([item.get("category"), " / ".join(self._string_list(item.get("items")))], "："))
            else:
                skills.append(str(item))
        skills.extend(self._string_list(form_state.get("skills")))
        skills.extend(self._split_lines(form_state.get("skills_text")))
        skills.extend(self._split_lines(form_state.get("certificates_text")))
        skills.extend(self._split_lines(form_state.get("languages_text")))
        skills.extend(self._split_lines(sections.get("个人技能") or sections.get("技能证书") or ""))
        return [item for item in self._dedupe(skills) if item]

    def _items_from_section(self, text: str, *, default_title: str) -> List[ResumeItem]:
        raw_lines = [line.strip() for line in re.split(r"[\n\r]+", str(text or "")) if line.strip()]
        if not raw_lines:
            return []

        items: List[ResumeItem] = []
        current: ResumeItem | None = None
        for raw_line in raw_lines:
            cleaned = self._strip_bullet(raw_line)
            is_bullet = cleaned != raw_line.strip()
            if not is_bullet and self._looks_like_item_heading(cleaned, default_title):
                current = self._item_from_heading(cleaned, default_title)
                items.append(current)
                continue
            if current is None:
                current = ResumeItem(title=default_title)
                items.append(current)
            if cleaned:
                current.bullets.append(cleaned)

        return [
            item
            for item in items
            if item.title or item.organization or item.role or item.bullets or item.summary
        ]

    @staticmethod
    def _pick_basic_info(form_state: Dict[str, Any]) -> Dict[str, Any]:
        return form_state.get("basic_info") if isinstance(form_state.get("basic_info"), dict) else form_state

    def _parse_markdown_sections(self, text: str) -> Dict[str, str]:
        sections: Dict[str, str] = {}
        aliases = {
            "个人信息": "个人信息",
            "基本信息": "个人信息",
            "教育": "教育背景",
            "教育背景": "教育背景",
            "教育经历": "教育背景",
            "实习经历": "实习经历",
            "工作经历": "工作经历",
            "实习/工作经历": "实习/工作经历",
            "项目经历": "项目经历",
            "项目经验": "项目经历",
            "获奖情况": "获奖情况",
            "获奖经历": "获奖情况",
            "荣誉奖励": "获奖情况",
            "个人技能": "个人技能",
            "技能证书": "技能证书",
            "技能清单": "个人技能",
            "个人总结": "个人总结",
            "个人摘要": "个人总结",
            "自我评价": "个人总结",
        }
        current = ""
        buckets: Dict[str, List[str]] = {}
        for raw_line in (text or "").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            cleaned = re.sub(r"^#+\s*", "", line).strip()
            cleaned = re.sub(r"[：:]\s*$", "", cleaned)
            heading = aliases.get(cleaned)
            if heading:
                current = heading
                buckets.setdefault(current, [])
                continue
            if current:
                buckets.setdefault(current, []).append(raw_line)
        for key, values in buckets.items():
            sections[key] = "\n".join(values).strip()
        return sections

    @staticmethod
    def _extract_title_parts(text: str) -> tuple[str, str]:
        for line in (text or "").splitlines():
            cleaned = line.strip().lstrip("#").strip()
            if not cleaned or cleaned in {"个人信息", "基本信息"}:
                continue
            parts = [part.strip() for part in re.split(r"\s*[·•|｜]\s*", cleaned, maxsplit=1) if part.strip()]
            if len(parts) >= 2:
                return parts[0], parts[1]
            return cleaned.split()[0], ""
        return "", ""

    @staticmethod
    def _extract_labeled_info(text: str) -> Dict[str, str]:
        labels = {
            "姓名",
            "邮箱",
            "电话",
            "手机",
            "城市",
            "目标公司",
            "目标岗位",
            "意向岗位",
            "出生年月",
            "性别",
            "政治面貌",
        }
        info: Dict[str, str] = {}
        for raw_line in (text or "").splitlines():
            line = re.sub(r"^[\-•*●·l]\s*", "", raw_line.strip(), flags=re.IGNORECASE)
            match = re.match(r"^([^：:]{2,8})[：:]\s*(.+)$", line)
            if not match:
                continue
            label = match.group(1).strip()
            value = match.group(2).strip()
            if label in labels and value:
                info[label] = value
        return info

    @staticmethod
    def _first_text(*values: Any) -> str:
        for value in values:
            text = str(value or "").strip()
            if text:
                return text
        return ""

    @classmethod
    def _deep_find_text(cls, *values: Any, keys: set[str]) -> str:
        for value in values:
            found = cls._deep_find_text_in_value(value, keys)
            if found:
                return found
        return ""

    @classmethod
    def _deep_find_text_in_value(cls, value: Any, keys: set[str]) -> str:
        if isinstance(value, dict):
            for key, item in value.items():
                if str(key) in keys and str(item or "").strip():
                    return str(item).strip()
            for item in value.values():
                found = cls._deep_find_text_in_value(item, keys)
                if found:
                    return found
        elif isinstance(value, list):
            for item in value:
                found = cls._deep_find_text_in_value(item, keys)
                if found:
                    return found
        return ""

    @staticmethod
    def _string_list(value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item or "").strip()]
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return []

    @staticmethod
    def _split_lines(value: Any) -> List[str]:
        text = str(value or "")
        return [
            re.sub(r"^[\-•*●·l]\s*", "", line, flags=re.IGNORECASE).strip()
            for line in re.split(r"[\n\r]+", text)
            if re.sub(r"^[\-•*●·l]\s*", "", line, flags=re.IGNORECASE).strip()
        ]

    @staticmethod
    def _split_duration(value: Any) -> tuple[str, str]:
        text = str(value or "").strip()
        if not text:
            return "", ""
        parts = re.split(r"\s+(?:至|到|—|–|-|~|－)\s+|(?:至|到)", text, maxsplit=1)
        if len(parts) >= 2:
            return parts[0].strip(), parts[1].strip()
        return text, ""

    @staticmethod
    def _strip_bullet(value: str) -> str:
        return re.sub(r"^[\-•*●·l]\s*", "", str(value or "").strip(), flags=re.IGNORECASE).strip()

    @staticmethod
    def _looks_like_item_heading(value: str, default_title: str) -> bool:
        if not value:
            return False
        if "：" in value or value.startswith(("技术栈", "职责", "成果")):
            return False
        if re.search(r"\d{4}[.\-/年]", value):
            return True
        if "|" in value or "｜" in value:
            return True
        return False

    def _item_from_heading(self, value: str, default_title: str) -> ResumeItem:
        parts = [part.strip() for part in re.split(r"\s*[|｜]\s*", value) if part.strip()]
        if not parts:
            return ResumeItem(title=default_title)

        date_index = next((index for index, part in enumerate(parts) if re.search(r"\d{4}[.\-/年]", part)), -1)
        start_date = ""
        end_date = ""
        if date_index >= 0:
            start_date, end_date = self._split_duration(parts[date_index])
            parts.pop(date_index)

        if default_title == "教育":
            return ResumeItem(
                organization=parts[0] if len(parts) > 0 else "",
                role=parts[1] if len(parts) > 1 else "",
                title=parts[2] if len(parts) > 2 else "",
                start_date=start_date,
                end_date=end_date,
            )
        if default_title == "项目经历":
            return ResumeItem(
                title=parts[0] if len(parts) > 0 else default_title,
                role=parts[1] if len(parts) > 1 else "",
                organization=parts[2] if len(parts) > 2 else "",
                start_date=start_date,
                end_date=end_date,
            )
        return ResumeItem(
            organization=parts[0] if len(parts) > 0 else "",
            role=parts[1] if len(parts) > 1 else "",
            location=parts[2] if len(parts) > 2 else "",
            start_date=start_date,
            end_date=end_date,
        )

    @staticmethod
    def _date_range(item: ResumeItem) -> str:
        def fmt(value: str) -> str:
            return re.sub(r"(\d{4})-(\d{1,2})", r"\1.\2", value or "")

        if item.start_date and item.end_date:
            return f"{fmt(item.start_date)} - {fmt(item.end_date)}"
        return fmt(item.start_date or item.end_date)

    def _item_header(self, item: ResumeItem) -> str:
        parts = [
            self._date_range(item),
            item.organization or item.title,
            item.role,
            item.location,
        ]
        return self._join_nonempty(parts, "      ")

    def _limited_bullets(
        self,
        item: ResumeItem,
        count: int,
        max_chars: int,
        layout_notes: List[str],
    ) -> List[str]:
        bullets = [item.summary, *item.bullets]
        if item.tools:
            bullets.append(f"技术栈：{' / '.join(item.tools)}")
        cleaned = [self._compact_text(value, max_chars, layout_notes) for value in bullets if str(value or "").strip()]
        if len(cleaned) < count:
            cleaned.extend([""] * (count - len(cleaned)))
        if len(cleaned) > count:
            layout_notes.append(f"{item.title or item.organization or '经历'} 有 {len(cleaned) - count} 条要点未放入模板。")
        return cleaned[:count]

    def _compact_text(self, value: Any, max_chars: int, layout_notes: List[str]) -> str:
        text = re.sub(r"\s+", " ", str(value or "")).strip()
        if len(text) <= max_chars:
            return text
        layout_notes.append(f"长句已按模板行长压缩：{text[:18]}...")
        cut = max(text.rfind("，", 0, max_chars), text.rfind("；", 0, max_chars), text.rfind("。", 0, max_chars))
        if cut >= 16:
            return text[: cut + 1]
        return f"{text[:max_chars - 1]}…"

    @staticmethod
    def _bullet_or_blank(values: List[str], index: int, fallback: str) -> str:
        return values[index] if index < len(values) and values[index] else fallback

    @staticmethod
    def _join_nonempty(values: Iterable[Any], separator: str) -> str:
        return separator.join(str(value).strip() for value in values if str(value or "").strip())

    def _normalize_skill_lines(self, skills: List[str]) -> List[str]:
        normalized = []
        for skill in skills:
            text = str(skill or "").strip()
            if not text:
                continue
            normalized.append(text if "：" in text else f"技能：{text}")
        return self._dedupe(normalized)

    @staticmethod
    def _skill_line(skills: List[str], index: int, fallback: str) -> str:
        return skills[index] if index < len(skills) and skills[index] else fallback

    @staticmethod
    def _split_summary(value: str) -> List[str]:
        sentences = [item.strip() for item in re.split(r"[。；;\n]+", value or "") if item.strip()]
        if not sentences and value.strip():
            sentences = [value.strip()]
        return [sentence if sentence.endswith("。") else f"{sentence}。" for sentence in sentences[:3]]

    @staticmethod
    def _dedupe(values: Iterable[str]) -> List[str]:
        seen = set()
        result = []
        for value in values:
            text = str(value or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            result.append(text)
        return result

    @staticmethod
    def _safe_stem(value: str) -> str:
        safe = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff_-]+", "_", value)
        safe = re.sub(r"_+", "_", safe).strip("._-")
        return safe or f"resume_{uuid.uuid4().hex[:8]}"
