"""AI engine that uses OpenAI when available and a local fallback when not configured."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Dict, List
from urllib.parse import urlparse

import instructor
from openai import OpenAI

from ai_modules.prompts import (
    EXISTING_RESUME_SYSTEM_PROMPT,
    QUESTION_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
    REVISION_SYSTEM_PROMPT,
    build_existing_resume_input,
    build_existing_resume_messages,
    build_question_messages,
    build_questions_input,
    build_resume_input,
    build_resume_messages,
    build_revision_input,
    build_revision_messages,
)
from ai_modules.structured_contracts import (
    ResumeEducationRecord,
    ResumeExperienceRecord,
    ResumeGenerationResult,
    ResumeProjectRecord,
    ResumeQuestionResult,
    ResumeRevisionResult,
    ResumeSkillCategory,
    StructuredResume,
)
from ai_modules.structured_renderer import build_contract_report, render_resume_markdown


class ResumeAIEngine:
    """Generate questions, draft resumes, and revisions for the local prototype."""

    def __init__(self, api_key: str = "", base_url: str = "", model_name: str = "gpt-5.4-mini"):
        self.api_key = api_key or ""
        self.base_url = (base_url or "").rstrip("/")
        self.model_name = model_name
        self.client = (
            OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or None,
            )
            if self.api_key
            else None
        )
        self.structured_client = (
            instructor.from_openai(self.client, mode=instructor.Mode.TOOLS) if self.client else None
        )
        self.session_context: Dict[str, object] = {}
        self.reset_session_context()

    @property
    def is_available(self) -> bool:
        """Tell the UI whether real AI mode is enabled."""

        return self.client is not None

    @property
    def effective_base_url(self) -> str:
        """Return the configured API base URL or the OpenAI default."""

        return self.base_url or "https://api.openai.com/v1"

    @property
    def provider_name(self) -> str:
        """Return a short provider label for diagnostics."""

        if not self.base_url:
            return "OpenAI"

        hostname = urlparse(self.effective_base_url).hostname or ""
        if not hostname:
            return "OpenAI-compatible"
        if hostname.endswith("openai.com"):
            return "OpenAI"
        return hostname

    def reset_session_context(self, persistent_profile_memory: Dict | None = None) -> Dict[str, object]:
        """Clear transient runtime context and reload only the persistent user profile memory."""

        self.session_context = {
            "session_reset_at": datetime.now(timezone.utc).isoformat(),
            "persistent_profile_memory": dict(persistent_profile_memory or {}),
        }
        return dict(self.session_context)

    def update_persistent_profile_memory(self, persistent_profile_memory: Dict | None = None) -> Dict[str, object]:
        """Refresh the in-memory persistent profile without carrying over old transient context."""

        if not self.session_context:
            return self.reset_session_context(persistent_profile_memory)

        self.session_context["persistent_profile_memory"] = dict(persistent_profile_memory or {})
        return dict(self.session_context)

    def _with_session_context(self, payload: Dict) -> Dict:
        """Attach the only allowed carry-over memory to one model request."""

        enriched = dict(payload or {})
        persistent_profile_memory = self.session_context.get("persistent_profile_memory") or {}
        if persistent_profile_memory:
            enriched["persistent_profile_memory"] = persistent_profile_memory
        enriched["session_reset_at"] = self.session_context.get("session_reset_at", "")
        return enriched

    def _stream_text(self, system_prompt: str, payload_text: str) -> str:
        """Collect streamed text from the Responses API."""

        raw_text_parts: List[str] = []
        with self.client.responses.stream(
            model=self.model_name,
            instructions=system_prompt,
            input=payload_text,
        ) as stream:
            for event in stream:
                event_type = getattr(event, "type", "")
                if event_type == "response.output_text.delta":
                    delta = getattr(event, "delta", "") or ""
                    if delta:
                        raw_text_parts.append(delta)
                elif event_type == "response.output_text.done" and not raw_text_parts:
                    text = getattr(event, "text", "") or ""
                    if text:
                        raw_text_parts.append(text)

            if not raw_text_parts:
                final_response = stream.get_final_response()
                return getattr(final_response, "output_text", "") or ""

        return "".join(raw_text_parts)

    def _extract_json(self, raw_text: str) -> Dict:
        """Best-effort JSON parsing for model responses."""

        cleaned = raw_text.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            first = cleaned.find("{")
            last = cleaned.rfind("}")
            if first != -1 and last != -1:
                return json.loads(cleaned[first : last + 1])
        raise ValueError("Model did not return valid JSON.")

    def _call_openai(self, system_prompt: str, payload_text: str) -> Dict:
        """Call OpenAI Responses API and parse the JSON result."""

        if not self.client:
            raise RuntimeError("OpenAI client is not configured.")

        raw_text = self._stream_text(system_prompt, payload_text)
        return self._extract_json(raw_text)

    def _call_structured(self, response_model, messages: List[Dict[str, str]], max_retries: int = 2):
        """Call Instructor with a strict Pydantic response model."""

        if not self.structured_client:
            raise RuntimeError("Structured OpenAI client is not configured.")

        return self.structured_client.chat.completions.create(
            model=self.model_name,
            response_model=response_model,
            messages=messages,
            max_retries=max_retries,
            temperature=0.2,
        )

    def probe_model(self) -> Dict:
        """Run a lightweight live probe against the configured model."""

        checked_at = datetime.now(timezone.utc).isoformat()
        base_payload = {
            "provider": self.provider_name,
            "model": self.model_name,
            "base_url": self.effective_base_url,
            "checked_at": checked_at,
            "wire_api": "responses.stream",
        }

        if not self.client:
            return {
                **base_payload,
                "configured": False,
                "reachable": False,
                "status": "fallback_only",
                "latency_ms": None,
                "sample_output": "",
                "error": "OPENAI_API_KEY is not configured.",
            }

        started_at = time.perf_counter()
        try:
            raw_text = self._stream_text(
                "You are a connectivity probe. Reply with exactly: ok",
                "Reply with exactly: ok",
            ).strip()
            latency_ms = int((time.perf_counter() - started_at) * 1000)
            reachable = bool(raw_text)
            return {
                **base_payload,
                "configured": True,
                "reachable": reachable,
                "status": "operational" if reachable else "degraded",
                "latency_ms": latency_ms,
                "sample_output": raw_text[:80],
                "error": "" if reachable else "Probe completed but returned an empty response.",
            }
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started_at) * 1000)
            return {
                **base_payload,
                "configured": True,
                "reachable": False,
                "status": "error",
                "latency_ms": latency_ms,
                "sample_output": "",
                "error": str(exc),
            }

    def _nonempty(self, values: List[str]) -> List[str]:
        """Drop blank list items created by UI forms."""

        return [item.strip() for item in values if item and item.strip()]

    def _answered_questions(self, profile_payload: Dict) -> set[str]:
        """Collect already-answered follow-up questions to avoid repeating them."""

        answers = profile_payload.get("additional_answers", [])
        return {
            item.get("question", "").strip()
            for item in answers
            if item.get("question", "").strip() and item.get("answer", "").strip()
        }

    def _has_metric(self, text_parts: List[str]) -> bool:
        """Detect whether any text contains numeric evidence."""

        return any(any(char.isdigit() for char in part) for part in text_parts if part)

    def _attachment_excerpt(self, item: Dict, limit: int = 140) -> str:
        """Return a short snippet of attachment text for rendering."""

        context = (item.get("attachment_context", "") or "").strip()
        if not context:
            return ""
        return context[:limit] + ("..." if len(context) > limit else "")

    def _plain_text(self, text: str) -> str:
        """Convert markdown-like text into cleaner plain text blocks."""

        return (
            (text or "")
            .replace("\r\n", "\n")
            .replace("\r", "\n")
            .replace("## ", "")
            .replace("# ", "")
            .replace("- ", "")
            .replace("**", "")
            .replace("`", "")
            .strip()
        )

    def _dynamic_gap_questions(self, profile_payload: Dict) -> List[str]:
        """Generate contextual fallback questions focused on project and internship records."""

        answered = self._answered_questions(profile_payload)
        questions: List[str] = []

        def push(question: str) -> None:
            if question and question not in questions and question not in answered and len(questions) < 3:
                questions.append(question)

        projects = profile_payload.get("projects", [])
        experiences = profile_payload.get("experiences", [])

        if not projects and not experiences:
            push("你最想重点展开哪一段项目或实习经历？请补充一段方便生成更有说服力的简历。")
            return questions

        for index, item in enumerate(projects):
            label = item.get("name", "").strip() or f"项目 {index + 1}"
            role = item.get("role", "").strip()
            description = item.get("description", "").strip()
            highlights = self._nonempty(item.get("highlights", []))
            attachment_context = (item.get("attachment_context", "") or "").strip()
            text_parts = [description, attachment_context, *highlights]

            if not role:
                push(f"项目「{label}」里你具体负责哪一部分？")
            if not description and not attachment_context:
                push(f"项目「{label}」的业务场景、目标和最终产出是什么？")
            if len(highlights) == 0:
                push(f"项目「{label}」里你做过哪些关键动作？请给 2 到 3 条。")
            if text_parts and not self._has_metric(text_parts):
                push(f"项目「{label}」有没有可量化的结果，例如效率提升、用户量、耗时下降或交付数量？")

        for index, item in enumerate(experiences):
            label = item.get("company", "").strip() or f"实习经历 {index + 1}"
            role = item.get("role", "").strip()
            highlights = self._nonempty(item.get("highlights", []))
            attachment_context = (item.get("attachment_context", "") or "").strip()
            text_parts = [attachment_context, *highlights]

            if not role:
                push(f"在「{label}」这段经历里，你的岗位名称和主要职责分别是什么？")
            if len(highlights) == 0 and not attachment_context:
                push(f"在「{label}」这段经历里，你做过哪些核心工作？")
            if text_parts and not self._has_metric(text_parts):
                push(f"在「{label}」这段经历里，有没有可量化的结果，例如接口性能、效率提升或交付数量？")

        return questions

    def _dynamic_existing_resume_questions(self, payload: Dict) -> List[str]:
        """Generate fallback questions for an uploaded resume matched to a target job."""

        resume_text = (payload.get("resume_text") or "").strip()
        target_company = (payload.get("target_company") or "").strip()
        target_role = (payload.get("target_role") or "").strip() or "目标岗位"
        job_requirements = (payload.get("job_requirements") or "").strip()
        answers = payload.get("additional_answers") or []
        answered = {
            item.get("question", "").strip()
            for item in answers
            if item.get("question", "").strip() and item.get("answer", "").strip()
        }
        questions: List[str] = []

        def push(question: str) -> None:
            if question and question not in questions and question not in answered and len(questions) < 3:
                questions.append(question)

        company_prefix = f"{target_company}的" if target_company else ""
        role_text = f"{company_prefix}{target_role}"

        if not job_requirements:
            push(f"这个{role_text}岗位最看重哪些能力？请补一段招聘要求或 JD 关键词。")

        if resume_text and not any(char.isdigit() for char in resume_text):
            push(f"如果投递{role_text}，你最能证明能力的量化成果是什么？请补 1 到 2 条带数字的结果。")

        if job_requirements:
            push(f"针对{role_text}，你最想重点匹配哪几条招聘要求？")
            if not any(keyword in resume_text for keyword in ["项目", "实习", "负责", "优化", "设计"]):
                push(f"针对{role_text}，你最相关的一段项目或实习经历是什么？请补充职责、动作和结果。")

        return questions

    def _is_basic_mode(self, profile_payload: Dict) -> bool:
        """Detect whether the current user wants compressed output."""

        return (
            profile_payload.get("membership_level", "basic") == "basic"
            and not profile_payload.get("use_full_information", False)
        )

    def _limit_items(self, items: List[Dict], max_count: int, max_highlights: int) -> List[Dict]:
        """Keep fallback output concise for basic users."""

        trimmed: List[Dict] = []
        for item in items[:max_count]:
            next_item = dict(item)
            next_item["highlights"] = self._nonempty(item.get("highlights", []))[:max_highlights]
            trimmed.append(next_item)
        return trimmed

    def _compress_profile(self, profile_payload: Dict) -> Dict:
        """Apply tier-based compression rules before prompt generation."""

        compressed = dict(profile_payload)
        basic_mode = self._is_basic_mode(profile_payload)
        max_count = 2 if basic_mode else 4
        max_highlights = 2 if basic_mode else 4

        compressed["skills"] = self._nonempty(profile_payload.get("skills", []))[: (6 if basic_mode else 12)]
        compressed["education"] = self._limit_items(profile_payload.get("education", []), max_count, max_highlights)
        compressed["projects"] = self._limit_items(profile_payload.get("projects", []), max_count, max_highlights)
        compressed["experiences"] = self._limit_items(
            profile_payload.get("experiences", []), max_count, max_highlights
        )
        return compressed

    def _categorize_skills(self, skills: List[str]) -> List[ResumeSkillCategory]:
        """Group flat skill strings into lightweight categories for the frontend contract."""

        buckets = {
            "Frontend": [],
            "Backend": [],
            "Data": [],
            "AI": [],
            "Tools": [],
            "Languages": [],
            "Other": [],
        }

        for skill in self._nonempty(skills):
            lowered = skill.lower()
            if any(keyword in lowered for keyword in ["react", "vue", "css", "html", "vite", "javascript"]):
                bucket = "Frontend"
            elif any(keyword in lowered for keyword in ["python", "java", "golang", "fastapi", "sql", "mysql"]):
                bucket = "Backend"
            elif any(keyword in lowered for keyword in ["spark", "flink", "hive", "etl", "warehouse", "data"]):
                bucket = "Data"
            elif any(keyword in lowered for keyword in ["llm", "rag", "prompt", "openai", "agent", "ai"]):
                bucket = "AI"
            elif any(keyword in lowered for keyword in ["git", "docker", "linux", "k8s", "postman", "jenkins"]):
                bucket = "Tools"
            elif any(keyword in lowered for keyword in ["english", "chinese", "c++", "typescript"]):
                bucket = "Languages"
            else:
                bucket = "Other"
            if skill not in buckets[bucket]:
                buckets[bucket].append(skill)

        return [
            ResumeSkillCategory(category=category, items=items)
            for category, items in buckets.items()
            if items
        ]

    def _structured_from_profile(self, profile_payload: Dict) -> StructuredResume:
        """Build a deterministic structured resume from the existing profile payload."""

        payload = self._compress_profile(profile_payload)
        basic_info = payload.get("basic_info", {})

        return StructuredResume(
            contact={
                "full_name": basic_info.get("name", "").strip(),
                "email": basic_info.get("email", "").strip(),
                "phone": basic_info.get("phone", "").strip(),
                "city": basic_info.get("city", "").strip(),
                "target_company": basic_info.get("target_company", "").strip(),
                "target_role": basic_info.get("target_role", "").strip(),
            },
            summary=self._fallback_summary(payload),
            experience=[
                ResumeExperienceRecord(
                    company_name=item.get("company", "").strip() or "Undisclosed Company",
                    job_title=item.get("role", "").strip() or "Role",
                    start_date=item.get("start_date", "").strip(),
                    end_date=item.get("end_date", "").strip(),
                    role_scope=self._attachment_excerpt(item, limit=110),
                    achievements=self._nonempty(item.get("highlights", [])),
                    tools=[],
                )
                for item in payload.get("experiences", [])
            ],
            education=[
                ResumeEducationRecord(
                    school_name=item.get("school", "").strip() or "School",
                    degree=item.get("degree", "").strip(),
                    major=item.get("major", "").strip(),
                    start_date=item.get("start_date", "").strip(),
                    end_date=item.get("end_date", "").strip(),
                    highlights=self._nonempty(item.get("highlights", [])),
                )
                for item in payload.get("education", [])
            ],
            skills=self._categorize_skills(payload.get("skills", [])),
            projects=[
                ResumeProjectRecord(
                    project_name=item.get("name", "").strip() or "Project",
                    role=item.get("role", "").strip(),
                    start_date=item.get("start_date", "").strip(),
                    end_date=item.get("end_date", "").strip(),
                    project_summary=item.get("description", "").strip() or self._attachment_excerpt(item, limit=120),
                    achievements=self._nonempty(item.get("highlights", [])),
                    tools=[],
                )
                for item in payload.get("projects", [])
            ],
        )

    def _structured_from_existing_payload(self, payload: Dict) -> StructuredResume:
        """Build a minimal structured resume from an uploaded resume payload."""

        resume_text = self._plain_text(payload.get("resume_text", ""))
        summary = "\n".join(line for line in resume_text.splitlines()[:6] if line.strip()).strip()

        return StructuredResume(
            contact={
                "full_name": "",
                "email": "",
                "phone": "",
                "city": "",
                "target_company": (payload.get("target_company") or "").strip(),
                "target_role": (payload.get("target_role") or "").strip(),
            },
            summary=summary,
            experience=[],
            education=[],
            skills=[],
            projects=[],
        )

    def _title_from_structured_resume(self, structured_resume: StructuredResume) -> str:
        """Build a stable workspace title from the validated contract."""

        headline = structured_resume.contact.full_name.strip() or "Resume Draft"
        role = structured_resume.contact.target_role.strip()
        return f"{headline} - {role}" if role else headline

    def _result_from_structured_resume(
        self,
        structured_resume: StructuredResume,
        analysis_notes: List[str],
        questions: List[str] | None = None,
        mode: str = "openai",
        used_ai: bool = True,
        title: str = "",
    ) -> Dict:
        """Convert a validated contract into the response shape expected by the UI."""

        normalized_questions = [question for question in (questions or []) if question][:3]
        workspace_title = (title or "").strip() or self._title_from_structured_resume(structured_resume)
        return {
            "title": workspace_title,
            "resume_text": render_resume_markdown(structured_resume),
            "structured_resume": structured_resume.model_dump(),
            "analysis_notes": analysis_notes,
            "questions": normalized_questions,
            "needs_clarification": len(normalized_questions) > 0,
            "used_ai": used_ai,
            "mode": mode,
            "contract_report": build_contract_report(
                structured_resume,
                renderer="instructor" if used_ai else "local_renderer",
                question_count=len(normalized_questions),
            ),
        }

    def _fallback_summary(self, profile_payload: Dict) -> str:
        """Create a compact self-summary without real AI."""

        basic_info = profile_payload.get("basic_info", {})
        skills = self._nonempty(profile_payload.get("skills", []))
        education = profile_payload.get("education", [])
        target_company = basic_info.get("target_company", "").strip()
        role = basic_info.get("target_role") or "求职者"
        job_requirements = basic_info.get("job_requirements", "").strip()
        summary = basic_info.get("summary", "").strip()

        if summary:
            return summary

        school_info = ""
        if education:
            school = education[0].get("school", "")
            major = education[0].get("major", "")
            school_info = f"，目前背景为{school}{major}"

        skill_text = "、".join(skills[:4]) if skills else "工程实践与快速学习"
        target_text = f"{target_company}{role}" if target_company else role
        requirement_text = f"，并尽量贴近招聘要求：{job_requirements[:36]}" if job_requirements else ""
        return f"目标岗位为{target_text}{school_info}，具备{skill_text}相关能力{requirement_text}，适合作为本地测试版简历初稿。"

    def _render_resume_markdown(self, profile_payload: Dict, follow_up_questions: List[str]) -> Dict:
        """Deterministic fallback renderer used when OpenAI is not configured."""

        payload = self._compress_profile(profile_payload)
        basic_info = payload.get("basic_info", {})
        skills = payload.get("skills", [])
        education = payload.get("education", [])
        projects = payload.get("projects", [])
        experiences = payload.get("experiences", [])
        modules = payload.get("modules", [])
        answers = payload.get("additional_answers", [])

        title = basic_info.get("name", "未命名候选人")
        if basic_info.get("target_role"):
            title = f'{title}｜{basic_info["target_role"]}'

        lines: List[str] = [f"# {title}", ""]

        contact_row = " | ".join(
            part
            for part in [
                basic_info.get("email", "").strip(),
                basic_info.get("phone", "").strip(),
                basic_info.get("city", "").strip(),
            ]
            if part
        )
        if contact_row:
            lines.extend([contact_row, ""])

        if "summary" in modules:
            lines.extend(["## 个人简介", f"- {self._fallback_summary(payload)}", ""])

        if "skills" in modules and skills:
            lines.extend(["## 核心技能", f"- {' / '.join(skills)}", ""])

        if "education" in modules and education:
            lines.append("## 教育经历")
            for item in education:
                title_line = " | ".join(
                    part
                    for part in [
                        item.get("school", ""),
                        item.get("degree", ""),
                        item.get("major", ""),
                        f'{item.get("start_date", "")} - {item.get("end_date", "")}'.strip(" -"),
                    ]
                    if part.strip()
                )
                lines.append(f"- {title_line}")
                for highlight in self._nonempty(item.get("highlights", [])):
                    lines.append(f"  - {highlight}")
            lines.append("")

        if "projects" in modules and projects:
            lines.append("## 项目经历")
            for item in projects:
                title_line = " | ".join(
                    part
                    for part in [
                        item.get("name", ""),
                        item.get("role", ""),
                        f'{item.get("start_date", "")} - {item.get("end_date", "")}'.strip(" -"),
                    ]
                    if part.strip()
                )
                lines.append(f"- {title_line}")
                if item.get("description", "").strip():
                    lines.append(f"  - {item['description'].strip()}")
                for highlight in self._nonempty(item.get("highlights", [])):
                    lines.append(f"  - {highlight}")
                if "attachments" in modules and self._attachment_excerpt(item):
                    lines.append(f"  - 附件摘要：{self._attachment_excerpt(item)}")
            lines.append("")

        if "experience" in modules and experiences:
            lines.append("## 实习/工作经历")
            for item in experiences:
                title_line = " | ".join(
                    part
                    for part in [
                        item.get("company", ""),
                        item.get("role", ""),
                        f'{item.get("start_date", "")} - {item.get("end_date", "")}'.strip(" -"),
                    ]
                    if part.strip()
                )
                lines.append(f"- {title_line}")
                for highlight in self._nonempty(item.get("highlights", [])):
                    lines.append(f"  - {highlight}")
                if "attachments" in modules and self._attachment_excerpt(item):
                    lines.append(f"  - 附件摘要：{self._attachment_excerpt(item)}")
            lines.append("")

        if answers:
            lines.append("## AI 补充信息")
            for answer in answers:
                question = answer.get("question", "").strip()
                response = answer.get("answer", "").strip()
                if question and response:
                    lines.append(f"- {question}：{response}")
            lines.append("")

        if follow_up_questions:
            lines.extend(["## 待补充信息", *[f"- {question}" for question in follow_up_questions], ""])

        return {
            "title": title,
            "resume_text": "\n".join(lines).strip(),
            "questions": follow_up_questions,
            "analysis_notes": ["当前为本地兜底模式输出。接入 OPENAI_API_KEY 后会使用实时 AI 追问和润色。"],
        }

    def generate_questions(self, profile_payload: Dict) -> Dict:
        """Generate missing-information questions focused on projects and internships."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        if not self.client:
            return {
                "questions": fallback_questions,
                "detected_gaps": ["scoped_experience_gap" for _ in fallback_questions],
                "ready_for_generation": len(fallback_questions) == 0,
                "used_ai": False,
            }

        try:
            result = self._call_openai(
                QUESTION_SYSTEM_PROMPT,
                build_questions_input(self._compress_profile(self._with_session_context(profile_payload))),
            )
            questions = (result.get("questions") or [])[:3]
            return {
                "questions": questions,
                "detected_gaps": result.get("detected_gaps", []),
                "ready_for_generation": len(questions) == 0,
                "used_ai": True,
            }
        except Exception as exc:
            return {
                "questions": fallback_questions,
                "detected_gaps": ["openai_error"],
                "ready_for_generation": len(fallback_questions) == 0,
                "used_ai": False,
                "warning": f"OpenAI question generation failed: {exc}",
            }

    def generate_resume(self, profile_payload: Dict) -> Dict:
        """Generate a resume draft and return follow-up questions when needed."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        fallback_result = self._render_resume_markdown(profile_payload, fallback_questions)
        needs_clarification = len(fallback_questions) > 0

        if not self.client:
            fallback_result.update(
                {
                    "needs_clarification": needs_clarification,
                    "used_ai": False,
                    "mode": "fallback",
                }
            )
            return fallback_result

        try:
            result = self._call_openai(
                RESUME_SYSTEM_PROMPT,
                build_resume_input(self._compress_profile(self._with_session_context(profile_payload))),
            )
            questions = (result.get("questions") or [])[:3]
            result["title"] = result.get("title") or fallback_result["title"]
            result["resume_text"] = result.get("resume_text") or fallback_result["resume_text"]
            result.setdefault("analysis_notes", [])
            result["questions"] = questions
            result["needs_clarification"] = len(questions) > 0
            result["used_ai"] = True
            result["mode"] = "openai"
            return result
        except Exception as exc:
            fallback_result.update(
                {
                    "needs_clarification": needs_clarification,
                    "used_ai": False,
                    "mode": "fallback",
                    "analysis_notes": fallback_result["analysis_notes"]
                    + [f"OpenAI generation failed, fallback activated: {exc}"],
                }
            )
            return fallback_result

    def revise_resume(self, profile_payload: Dict, resume_text: str, instruction: str) -> Dict:
        """Revise an existing draft based on an extra instruction or manual edits."""

        basic_info = profile_payload.get("basic_info", {})
        title = basic_info.get("name", "未命名简历")
        if basic_info.get("target_role"):
            title = f'{title}｜{basic_info["target_role"]}'

        if not instruction.strip():
            return {
                "title": title,
                "resume_text": resume_text.strip(),
                "analysis_notes": ["未提供额外 AI 指令，已保留当前手动修改版本。"],
                "used_ai": False,
                "mode": "manual_preserve",
            }

        if not self.client:
            revised_text = (
                f"{resume_text.strip()}\n\n## 优化说明\n- 已根据指令补充优化方向：{instruction.strip()}\n"
            ).strip()
            return {
                "title": title,
                "resume_text": revised_text,
                "analysis_notes": ["当前为本地兜底修订结果。"],
                "used_ai": False,
                "mode": "fallback",
            }

        try:
            result = self._call_openai(
                REVISION_SYSTEM_PROMPT,
                build_revision_input(
                    self._compress_profile(self._with_session_context(profile_payload)),
                    resume_text,
                    instruction,
                ),
            )
            result["title"] = result.get("title") or title
            result["resume_text"] = result.get("resume_text") or resume_text.strip()
            result.setdefault("analysis_notes", [])
            result["used_ai"] = True
            result["mode"] = "openai"
            return result
        except Exception as exc:
            revised_text = (
                f"{resume_text.strip()}\n\n## 优化说明\n- OpenAI 修订失败，保留当前版本并记录指令：{instruction.strip()}\n"
            ).strip()
            return {
                "title": title,
                "resume_text": revised_text,
                "analysis_notes": [f"OpenAI revision failed, fallback activated: {exc}"],
                "used_ai": False,
                "mode": "fallback",
            }

    def optimize_existing_resume(self, payload: Dict) -> Dict:
        """Optimize an uploaded resume for a target company and role."""

        resume_text = (payload.get("resume_text") or "").strip()
        target_company = (payload.get("target_company") or "").strip()
        target_role = (payload.get("target_role") or "").strip() or "目标岗位"
        job_requirements = (payload.get("job_requirements") or "").strip()
        instruction = (payload.get("instruction") or "").strip()

        title = "｜".join(part for part in [target_company, target_role] if part) or target_role
        questions = self._dynamic_existing_resume_questions(payload)

        summary_lines = [
            f"目标公司：{target_company}" if target_company else "",
            f"目标岗位：{target_role}",
            f"招聘要求：{job_requirements}" if job_requirements else "",
            f"额外修订要求：{instruction}" if instruction else "",
        ]
        fallback_text = "\n\n".join(
            part for part in ["\n".join(line for line in summary_lines if line), self._plain_text(resume_text)] if part
        ).strip()
        fallback_result = {
            "title": title,
            "resume_text": fallback_text,
            "questions": questions,
            "analysis_notes": ["当前为已有简历岗位优化的本地兜底结果。"],
            "needs_clarification": len(questions) > 0,
            "used_ai": False,
            "mode": "fallback",
        }

        if not self.client:
            return fallback_result

        try:
            result = self._call_openai(
                EXISTING_RESUME_SYSTEM_PROMPT,
                build_existing_resume_input(
                    resume_text=resume_text,
                    target_company=target_company,
                    target_role=target_role,
                    job_requirements=job_requirements,
                    instruction=instruction,
                    additional_answers=payload.get("additional_answers") or [],
                    persistent_profile_memory=self.session_context.get("persistent_profile_memory") or {},
                ),
            )
            model_text = self._plain_text(result.get("resume_text") or fallback_text)
            model_questions = (result.get("questions") or [])[:3]
            return {
                "title": result.get("title") or title,
                "resume_text": model_text,
                "questions": model_questions,
                "analysis_notes": result.get("analysis_notes") or [],
                "needs_clarification": len(model_questions) > 0,
                "used_ai": True,
                "mode": "openai",
            }
        except Exception as exc:
            fallback_result["analysis_notes"] = fallback_result["analysis_notes"] + [
                f"OpenAI existing-resume optimization failed, fallback activated: {exc}"
            ]
            return fallback_result
