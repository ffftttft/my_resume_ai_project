"""DOCX template filling and preview generation for resume files."""

from __future__ import annotations

import json
import re
import time
import uuid
import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Iterable, List
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"w": WORD_NS}

ET.register_namespace("w", WORD_NS)


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
    target_company: str = ""
    target_role: str = ""
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
    ) -> None:
        self.project_root = project_root
        self.template_dir = self._resolve_project_path(template_dir)
        self.generated_dir = self._resolve_project_path(generated_dir)
        self.preview_dir = self._resolve_project_path(preview_dir)
        self.avatar_dir = self._resolve_project_path(avatar_dir)

        self.template_dir.mkdir(parents=True, exist_ok=True)
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        self.preview_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_project_path(self, path: Path) -> Path:
        if path.is_absolute():
            return path
        return (self.project_root / path).resolve()

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
        layout_notes: List[str] = []
        filled_docx = self._fill_docx_template(template_path, facts, capacity, avatar_path, layout_notes)

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
        self._render_preview_image(preview_path, facts, template, capacity, layout_notes)

        return {
            "kind": "docx_template",
            "file_name": docx_name,
            "saved_name": docx_name,
            "download_url": self._public_url("resume/file/generated", docx_name),
            "preview_name": preview_name,
            "preview_url": self._public_url("resume/file/preview", preview_name),
            "template_id": template_id,
            "template_name": template.get("name") or template_id,
            "board": board,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "layout_report": {
                "mode": "docx_template",
                "changed_scope": "只替换模板文本节点和头像图片，保留原字体、字号、段落样式和页面对象。",
                "bullets_per_item": int(capacity.get("bullets_per_item") or 3),
                "overflow_notes": layout_notes,
                "warning": "预览图用于浏览器查看，最终投递请以生成的 Word 为准。",
            },
        }

    def _fill_docx_template(
        self,
        template_path: Path,
        facts: ResumeFacts,
        capacity: Dict[str, Any],
        avatar_path: Path | None,
        layout_notes: List[str],
    ) -> bytes:
        with zipfile.ZipFile(template_path, "r") as source_zip:
            document_xml = source_zip.read("word/document.xml")
            root = ET.fromstring(document_xml)
            paragraphs = root.findall(".//w:p", NS)
            remove_indices: set[int] = set()

            self._apply_template_slots(paragraphs, facts, capacity, layout_notes, remove_indices)
            self._remove_paragraphs(root, remove_indices)

            document_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            avatar_bytes = self._build_avatar_media(avatar_path) if avatar_path else None

            output = BytesIO()
            with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as target_zip:
                for item in source_zip.infolist():
                    if item.filename == "word/document.xml":
                        target_zip.writestr(item, document_bytes)
                    elif avatar_bytes and item.filename == "word/media/image1.png":
                        target_zip.writestr(item, avatar_bytes)
                    else:
                        target_zip.writestr(item, source_zip.read(item.filename))

        return output.getvalue()

    def _apply_template_slots(
        self,
        paragraphs: List[ET.Element],
        facts: ResumeFacts,
        capacity: Dict[str, Any],
        layout_notes: List[str],
        remove_indices: set[int],
    ) -> None:
        bullets_per_item = int(capacity.get("bullets_per_item") or 3)
        max_bullet_chars = int(capacity.get("max_bullet_chars") or 42)
        slots = [
            (paragraph_index, paragraph)
            for paragraph_index, paragraph in enumerate(paragraphs)
            if self._direct_text_nodes(paragraph)
        ]

        def setp(index: int, text: str, *, bullet: bool = False, parts: List[str] | None = None) -> None:
            if index < len(slots):
                _, paragraph = slots[index]
                self._set_paragraph_text(
                    paragraph,
                    text,
                    keep_bullet=bullet and bool(str(text or "").strip()),
                    parts=parts,
                )

        def remove_slot(index: int) -> None:
            if index < len(slots):
                remove_indices.add(slots[index][0])

        def remove_range(start: int, end: int) -> None:
            for index in range(start, end + 1):
                remove_slot(index)

        def fill_bullets(start_index: int, item: ResumeItem, *, max_slots: int) -> None:
            bullets = self._limited_bullets(item, max_slots, max_bullet_chars, layout_notes)
            for offset in range(max_slots):
                if offset < len(bullets):
                    setp(start_index + offset, bullets[offset], bullet=True)
                else:
                    remove_slot(start_index + offset)

        for _, paragraph in slots:
            self._set_paragraph_text(paragraph, "")

        education = facts.education[0] if facts.education else ResumeItem()
        first_experience = facts.experience[0] if facts.experience else None
        projects = facts.projects[:2]
        first_project = projects[0] if projects else None
        second_project = projects[1] if len(projects) > 1 else None
        skills = self._normalize_skill_lines(facts.skills)
        summary_lines = self._split_summary(facts.summary)

        setp(
            0,
            "",
            parts=[
                facts.name or "姓名",
                f"意向岗位：{facts.target_role or ''}".rstrip(),
            ],
        )
        setp(1, f"目标公司：{facts.target_company}" if facts.target_company else "")
        setp(2, f"城市：{facts.city}" if facts.city else "")
        setp(3, f"邮箱：{facts.email}" if facts.email else "")
        setp(4, f"联系电话：{facts.phone}" if facts.phone else "")

        if facts.education:
            setp(5, "教育背景")
            setp(6, self._join_nonempty([self._date_range(education), education.organization, education.title, education.role], "      "))
            edu_highlights = education.bullets or []
            for offset in range(2):
                if offset < len(edu_highlights):
                    setp(7 + offset, self._compact_text(edu_highlights[offset], max_bullet_chars, layout_notes), bullet=True)
                else:
                    remove_slot(7 + offset)
        else:
            remove_range(5, 8)

        if first_experience:
            setp(9, "实习经历")
            setp(10, self._item_header(first_experience))
            fill_bullets(11, first_experience, max_slots=3)
        else:
            remove_range(9, 13)

        if first_project:
            setp(14, "项目经历")
            setp(15, "项目经历")
            setp(16, self._item_header(first_project))
            fill_bullets(17, first_project, max_slots=3)
        else:
            remove_range(14, 19)

        if second_project:
            setp(20, "项目经历")
            setp(21, self._item_header(second_project))
            fill_bullets(22, second_project, max_slots=3)
        else:
            remove_range(20, 24)

        if facts.awards:
            award_lines = [self._compact_text(item, 46, layout_notes) for item in facts.awards[:3]]
            setp(25, "荣誉奖励")
            for offset in range(3):
                if offset < len(award_lines):
                    setp(26 + offset, award_lines[offset], bullet=True)
                else:
                    remove_slot(26 + offset)
        else:
            remove_range(25, 28)

        if skills:
            setp(29, "技能证书")
            for offset in range(3):
                if offset < len(skills):
                    setp(30 + offset, self._skill_line(skills, offset, ""), bullet=True)
                else:
                    remove_slot(30 + offset)
        else:
            remove_range(29, 32)

        if summary_lines:
            setp(33, "自我评价")
            for offset in range(3):
                if offset < len(summary_lines):
                    setp(34 + offset, summary_lines[offset], bullet=True)
                else:
                    remove_slot(34 + offset)
        else:
            remove_range(33, 36)

        if len(facts.experience) > 1:
            layout_notes.append(f"还有 {len(facts.experience) - 1} 段实习/工作经历未放入一页模板。")
        if len(facts.projects) > 2:
            layout_notes.append(f"还有 {len(facts.projects) - 2} 个项目未放入一页模板。")

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
    ) -> None:
        run_nodes = self._direct_text_run_nodes(paragraph)
        text_nodes = [node for _, node in run_nodes]
        if not text_nodes:
            return

        for node in text_nodes:
            node.text = ""
            node.attrib.pop(f"{{{XML_NS}}}space", None)

        if parts:
            cleaned_parts = [str(part or "").strip() for part in parts]
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

        normalized = (text or "").strip()
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
            target_company=self._first_text(contact.get("target_company"), basic_info.get("target_company"), form_state.get("target_company"), labeled_info.get("目标公司")),
            target_role=self._first_text(contact.get("target_role"), basic_info.get("target_role"), form_state.get("target_role"), labeled_info.get("目标岗位"), labeled_info.get("意向岗位"), title_role),
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
        facts.education = self._extract_education(structured_resume, form_state, sections)
        facts.experience = self._extract_experience(structured_resume, form_state, sections)
        facts.projects = self._extract_projects(structured_resume, form_state, sections)
        facts.awards = self._extract_awards(structured_resume, form_state, sections)
        facts.skills = self._extract_skills(structured_resume, form_state, sections)
        return facts

    def _extract_education(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[ResumeItem]:
        records = []
        for item in structured.get("education") or []:
            records.append(
                ResumeItem(
                    title=str(item.get("major") or ""),
                    role=str(item.get("degree") or ""),
                    organization=str(item.get("school_name") or item.get("school") or ""),
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    bullets=self._string_list(item.get("highlights")),
                )
            )
        if records:
            return records
        for item in form_state.get("education") or []:
            records.append(
                ResumeItem(
                    title=str(item.get("major") or ""),
                    role=str(item.get("degree") or ""),
                    organization=str(item.get("school") or ""),
                    start_date=self._split_duration(item.get("duration"))[0],
                    end_date=self._split_duration(item.get("duration"))[1],
                    bullets=self._split_lines(item.get("highlights_text")),
                )
            )
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
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    summary=str(item.get("role_scope") or ""),
                    bullets=self._string_list(item.get("achievements") or item.get("highlights")),
                    tools=self._string_list(item.get("tools")),
                )
            )
        if records:
            return records
        for item in form_state.get("experiences") or []:
            records.append(
                ResumeItem(
                    organization=str(item.get("company") or ""),
                    role=str(item.get("role") or ""),
                    start_date=self._split_duration(item.get("duration"))[0],
                    end_date=self._split_duration(item.get("duration"))[1],
                    bullets=self._split_lines(item.get("highlights_text")),
                )
            )
        if records:
            return records
        return self._items_from_section(sections.get("实习经历") or sections.get("工作经历") or sections.get("实习/工作经历") or "", default_title="实习经历")

    def _extract_projects(self, structured: Dict[str, Any], form_state: Dict[str, Any], sections: Dict[str, str]) -> List[ResumeItem]:
        records = []
        for item in structured.get("projects") or []:
            records.append(
                ResumeItem(
                    title=str(item.get("project_name") or item.get("name") or ""),
                    role=str(item.get("role") or ""),
                    start_date=str(item.get("start_date") or ""),
                    end_date=str(item.get("end_date") or ""),
                    summary=str(item.get("project_summary") or item.get("description") or ""),
                    bullets=self._string_list(item.get("achievements") or item.get("highlights")),
                    tools=self._string_list(item.get("tools")),
                )
            )
        if records:
            return records
        for item in form_state.get("projects") or []:
            records.append(
                ResumeItem(
                    title=str(item.get("name") or ""),
                    role=str(item.get("role") or ""),
                    start_date=self._split_duration(item.get("duration"))[0],
                    end_date=self._split_duration(item.get("duration"))[1],
                    summary=str(item.get("description") or ""),
                    bullets=self._split_lines(item.get("highlights_text")),
                )
            )
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

    def _render_preview_image(
        self,
        output_path: Path,
        facts: ResumeFacts,
        template: Dict[str, Any],
        capacity: Dict[str, Any],
        layout_notes: List[str],
    ) -> None:
        width, height = 1240, 1754
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)
        navy = "#173f72"
        text = "#111827"
        muted = "#475569"
        line = "#2f5f97"
        margin_x = 86
        y = 64

        font_title = self._font(42, bold=True)
        font_h = self._font(28, bold=True)
        font_bold = self._font(20, bold=True)
        font_body = self._font(19)
        font_small = self._font(16)

        draw.text((margin_x, y), f"{facts.name or '姓名'} · {facts.target_role or '目标岗位'}", fill=navy, font=font_title)
        y += 72
        contact = [
            f"邮箱：{facts.email or '未填写'}",
            f"电话：{facts.phone or '未填写'}",
            f"城市：{facts.city or '未填写'}",
            f"目标公司：{facts.target_company or '未填写'}",
        ]
        for index, value in enumerate(contact):
            draw.text((margin_x + (index % 2) * 470, y + (index // 2) * 32), value, fill=text, font=font_body)
        y += 92

        def section(title: str) -> None:
            nonlocal y
            draw.text((margin_x, y), title, fill=navy, font=font_h)
            draw.line((margin_x, y + 40, width - margin_x, y + 40), fill=line, width=3)
            y += 58

        def bullet(value: str) -> None:
            nonlocal y
            wrapped = self._wrap_text(draw, value, font_body, width - margin_x * 2 - 26)
            for line_text in wrapped[:2]:
                draw.text((margin_x + 18, y), f"• {line_text}", fill=text, font=font_body)
                y += 30

        if facts.education:
            edu = facts.education[0]
            section("教育背景")
            draw.text((margin_x, y), self._item_header(edu), fill=text, font=font_bold)
            y += 34
            for item in edu.bullets[:2]:
                bullet(item)
            y += 12

        if facts.experience:
            section("实习经历")
            item = facts.experience[0]
            draw.text((margin_x, y), self._item_header(item), fill=text, font=font_bold)
            y += 34
            for item_text in self._limited_bullets(item, int(capacity.get("bullets_per_item") or 3), 60, layout_notes):
                bullet(item_text)
            y += 12

        if facts.projects:
            section("项目经历")
            for project in facts.projects[:2]:
                draw.text((margin_x, y), self._item_header(project), fill=text, font=font_bold)
                y += 34
                for item_text in self._limited_bullets(project, int(capacity.get("bullets_per_item") or 3), 62, layout_notes):
                    bullet(item_text)
                y += 16

        skill_lines = self._normalize_skill_lines(facts.skills)
        if skill_lines:
            section("个人技能")
            for item in skill_lines[:3]:
                bullet(item)
            y += 12

        summary_items = self._split_summary(facts.summary)
        if summary_items:
            section("个人总结")
            for item in summary_items[:3]:
                bullet(item)

        if layout_notes:
            footer = "版式提示：" + "；".join(self._dedupe(layout_notes)[:2])
            draw.text((margin_x, height - 54), footer[:70], fill=muted, font=font_small)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(output_path, format="PNG")

    def _font(self, size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
        candidates = [
            Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
            Path("C:/Windows/Fonts/simhei.ttf"),
            Path("C:/Windows/Fonts/simsun.ttc"),
        ]
        for path in candidates:
            if path.exists():
                return ImageFont.truetype(str(path), size=size)
        return ImageFont.load_default()

    def _wrap_text(self, draw: ImageDraw.ImageDraw, value: str, font: ImageFont.FreeTypeFont, max_width: int) -> List[str]:
        text = re.sub(r"\s+", " ", value or "").strip()
        if not text:
            return [""]
        lines: List[str] = []
        current = ""
        for char in text:
            candidate = current + char
            if draw.textlength(candidate, font=font) <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = char
        if current:
            lines.append(current)
        return lines

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
