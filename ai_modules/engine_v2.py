"""Updated AI engine with tighter one-page follow-up logic."""

from __future__ import annotations

from typing import Dict, List

from ai_modules.engine import ResumeAIEngine as BaseResumeAIEngine
from ai_modules.prompts import (
    EXISTING_RESUME_SYSTEM_PROMPT,
    QUESTION_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
    build_existing_resume_input,
    build_questions_input,
    build_resume_input,
)


ROLE_SKILL_HINTS = (
    {
        "keywords": ("大数据", "数据工程", "数仓", "data engineer"),
        "skills": ("Linux", "SQL", "Hive / Spark / Flink", "数据仓库建模"),
    },
    {
        "keywords": ("后端", "后端开发", "backend", "java", "golang", "python"),
        "skills": ("Linux", "SQL / MySQL", "接口设计", "缓存或消息队列"),
    },
    {
        "keywords": ("前端", "frontend", "web 前端", "react", "vue"),
        "skills": ("HTML / CSS / JavaScript", "React / Vue", "前端工程化", "接口联调"),
    },
    {
        "keywords": ("算法", "机器学习", "ai", "llm", "模型"),
        "skills": ("Python", "Linux", "数据处理", "模型训练 / 评估"),
    },
    {
        "keywords": ("测试", "qa", "test"),
        "skills": ("测试用例设计", "接口自动化", "Linux", "缺陷定位"),
    },
    {
        "keywords": ("运维", "devops", "sre"),
        "skills": ("Linux", "脚本自动化", "CI / CD", "容器或云平台"),
    },
)


class ResumeAIEngine(BaseResumeAIEngine):
    """Compatibility wrapper that tightens follow-up questions to one page."""

    def _has_answered_follow_up(self, payload: Dict) -> bool:
        """Tell whether the user has already completed one follow-up round."""

        return bool(self._answered_questions(payload))

    def _clean_questions(self, questions: List[str], already_answered: bool = False) -> List[str]:
        """Normalize follow-up questions into one page, max three, one round only."""

        if already_answered:
            return []

        cleaned: List[str] = []
        for question in questions or []:
            normalized = (question or "").strip()
            if not normalized or normalized in cleaned:
                continue
            cleaned.append(normalized)
            if len(cleaned) >= 3:
                break
        return cleaned

    def _collect_profile_evidence_text(self, profile_payload: Dict) -> str:
        """Flatten profile content into one searchable text blob."""

        basic_info = profile_payload.get("basic_info", {})
        parts: List[str] = [
            basic_info.get("target_company", ""),
            basic_info.get("target_role", ""),
            basic_info.get("job_requirements", ""),
            basic_info.get("summary", ""),
            *self._nonempty(profile_payload.get("skills", [])),
        ]

        for item in profile_payload.get("projects", []):
            parts.extend(
                [
                    item.get("name", ""),
                    item.get("role", ""),
                    item.get("description", ""),
                    item.get("attachment_context", ""),
                    *self._nonempty(item.get("highlights", [])),
                ]
            )

        for item in profile_payload.get("experiences", []):
            parts.extend(
                [
                    item.get("company", ""),
                    item.get("role", ""),
                    item.get("attachment_context", ""),
                    *self._nonempty(item.get("highlights", [])),
                ]
            )

        return "\n".join(part.strip() for part in parts if part and part.strip())

    def _match_role_skills(self, target_role: str, job_requirements: str) -> List[str]:
        """Infer a small set of common role skills from role/JD keywords."""

        combined = f"{target_role} {job_requirements}".lower()
        matched: List[str] = []
        for rule in ROLE_SKILL_HINTS:
            if any(keyword.lower() in combined for keyword in rule["keywords"]):
                for skill in rule["skills"]:
                    if skill not in matched:
                        matched.append(skill)
        return matched[:4]

    def _build_common_skill_question(
        self,
        target_role: str,
        job_requirements: str,
        evidence_text: str,
    ) -> str:
        """Build one high-coverage question about role-common required skills."""

        required_skills = self._match_role_skills(target_role, job_requirements)
        if not required_skills:
            return ""

        evidence_lower = (evidence_text or "").lower()
        missing_skills: List[str] = []
        for skill in required_skills:
            tokens = [token.strip().lower() for token in skill.replace("/", " ").split() if token.strip()]
            if not any(token in evidence_lower for token in tokens):
                missing_skills.append(skill)

        if not missing_skills:
            return ""

        focus_skills = "、".join(missing_skills[:3])
        role_label = target_role.strip() or "目标岗位"
        return (
            f"针对{role_label}，这个方向通常需要掌握{focus_skills}。"
            "你目前会哪些？分别到什么程度、做过什么实际项目或工作场景？"
        )

    def _selected_missing_modules(self, profile_payload: Dict) -> List[str]:
        """Detect selected but still empty modules."""

        modules = set(profile_payload.get("modules", []))
        missing: List[str] = []
        if "skills" in modules and not self._nonempty(profile_payload.get("skills", [])):
            missing.append("技能模块")
        if "projects" in modules and not profile_payload.get("projects", []):
            missing.append("项目模块")
        if "experience" in modules and not profile_payload.get("experiences", []):
            missing.append("实习/工作模块")
        if "education" in modules and not profile_payload.get("education", []):
            missing.append("教育模块")
        return missing

    def _build_missing_module_question(self, profile_payload: Dict) -> str:
        """Build one summary question for empty required modules."""

        missing_modules = self._selected_missing_modules(profile_payload)
        if not missing_modules:
            return ""

        return (
            f"你当前还缺少{'、'.join(missing_modules[:3])}的有效内容。"
            "请优先补充最贴近目标岗位的1到2项，并用“模块名 + 关键信息”方式概括。"
        )

    def _pick_best_profile_record(self, profile_payload: Dict) -> tuple[str, str]:
        """Pick the single most relevant project/experience to ask about."""

        best_label = ""
        best_kind = ""
        best_score = -1

        for item in profile_payload.get("projects", []):
            text_parts = [
                item.get("name", ""),
                item.get("role", ""),
                item.get("description", ""),
                item.get("attachment_context", ""),
                *self._nonempty(item.get("highlights", [])),
            ]
            score = sum(len(part.strip()) for part in text_parts if part and part.strip())
            if score > best_score:
                best_score = score
                best_kind = "project"
                best_label = item.get("name", "").strip() or "这个项目"

        for item in profile_payload.get("experiences", []):
            text_parts = [
                item.get("company", ""),
                item.get("role", ""),
                item.get("attachment_context", ""),
                *self._nonempty(item.get("highlights", [])),
            ]
            score = sum(len(part.strip()) for part in text_parts if part and part.strip())
            if score > best_score:
                best_score = score
                best_kind = "experience"
                best_label = item.get("company", "").strip() or "这段经历"

        return best_kind, best_label

    def _build_profile_experience_question(self, profile_payload: Dict) -> str:
        """Build one high-coverage question about the most relevant experience."""

        kind, label = self._pick_best_profile_record(profile_payload)
        if kind == "project":
            return (
                f"请围绕项目《{label}》集中补充一段：业务背景、你负责的部分、"
                "关键技术/工具、最终结果或量化数据。"
            )
        if kind == "experience":
            return (
                f"请围绕你在《{label}》这段经历集中补充一段：岗位职责、核心动作、"
                "用到的技术/工具、最终结果或量化数据。"
            )
        return "请补充一段与你目标岗位最相关的项目或实习，尽量按“背景 / 职责 / 技术 / 结果”四点概括。"

    def _build_existing_missing_module_question(self, resume_text: str) -> str:
        """Ask for one missing core section in an uploaded resume when obvious."""

        missing_sections: List[str] = []
        if not any(keyword in resume_text for keyword in ["技能", "技术栈", "stack"]):
            missing_sections.append("技能栈")
        if not any(keyword in resume_text for keyword in ["项目", "project"]):
            missing_sections.append("项目经历")
        if not any(keyword in resume_text for keyword in ["实习", "工作", "经历", "公司"]):
            missing_sections.append("实习/工作经历")
        if not missing_sections:
            return ""
        return (
            f"这份简历目前还缺少{'、'.join(missing_sections[:3])}的关键信息。"
            "请优先补充最贴近目标岗位的一块，并用“模块名 + 关键信息”方式概括。"
        )

    def _build_existing_experience_question(self, resume_text: str, target_role: str) -> str:
        """Ask one summary question about the most relevant existing-resume experience."""

        lines = [line.strip(" -•\t") for line in (resume_text or "").splitlines()]
        anchor = next((line for line in lines if len(line) >= 6), "")
        role_label = target_role.strip() or "目标岗位"
        if anchor:
            return (
                f"请围绕“{anchor[:24]}”这段与{role_label}最相关的经历集中补充："
                "背景、你的职责、关键技术/工具、最终结果或量化数据。"
            )
        return (
            f"请补充一段与你申请{role_label}最相关的经历，"
            "尽量按“背景 / 职责 / 技术 / 结果”四点集中概括。"
        )

    def _dynamic_gap_questions(self, profile_payload: Dict) -> List[str]:
        """Generate one-page fallback questions for greenfield resume drafting."""

        if self._has_answered_follow_up(profile_payload):
            return []

        basic_info = profile_payload.get("basic_info", {})
        evidence_text = self._collect_profile_evidence_text(profile_payload)
        return self._clean_questions(
            [
                self._build_missing_module_question(profile_payload),
                self._build_common_skill_question(
                    basic_info.get("target_role", ""),
                    basic_info.get("job_requirements", ""),
                    evidence_text,
                ),
                self._build_profile_experience_question(profile_payload),
            ]
        )

    def _dynamic_existing_resume_questions(self, payload: Dict) -> List[str]:
        """Generate one-page fallback questions for existing-resume optimization."""

        if self._has_answered_follow_up(payload):
            return []

        resume_text = (payload.get("resume_text") or "").strip()
        target_role = (payload.get("target_role") or "").strip() or "目标岗位"
        job_requirements = (payload.get("job_requirements") or "").strip()

        return self._clean_questions(
            [
                self._build_common_skill_question(target_role, job_requirements, resume_text),
                self._build_existing_missing_module_question(resume_text),
                self._build_existing_experience_question(resume_text, target_role),
            ]
        )

    def generate_questions(self, profile_payload: Dict) -> Dict:
        """Generate missing-information questions in one round only."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        if not self.client:
            return {
                "questions": fallback_questions,
                "detected_gaps": ["one_page_gap" for _ in fallback_questions],
                "ready_for_generation": len(fallback_questions) == 0,
                "used_ai": False,
            }

        try:
            result = self._call_openai(
                QUESTION_SYSTEM_PROMPT,
                build_questions_input(self._compress_profile(profile_payload)),
            )
            questions = self._clean_questions(
                result.get("questions") or [],
                already_answered=self._has_answered_follow_up(profile_payload),
            )
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
                build_resume_input(self._compress_profile(profile_payload)),
            )
            questions = self._clean_questions(
                result.get("questions") or [],
                already_answered=self._has_answered_follow_up(profile_payload),
            )
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
            f"额外修正要求：{instruction}" if instruction else "",
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
                ),
            )
            model_text = self._plain_text(result.get("resume_text") or fallback_text)
            model_questions = self._clean_questions(
                result.get("questions") or [],
                already_answered=self._has_answered_follow_up(payload),
            )
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
