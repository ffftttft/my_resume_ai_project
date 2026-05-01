"""Application service that connects FastAPI requests with AI generation logic."""

from __future__ import annotations

from io import BytesIO
from typing import Dict, Tuple

from ai_modules.engine_v3 import ResumeAIEngine
from app.models import UserProfile

from .job_search_service import JobSearchService
from .memory_service import MemoryService
from .profile_memory_service import ProfileMemoryService
from .rag_service import RagService
from .semantic_ats_service import SemanticATSService


class ResumeService:
    """Orchestrates generation, revision, export, memory updates, and web job search."""

    def __init__(
        self,
        memory_service: MemoryService,
        profile_memory_service: ProfileMemoryService,
        ai_engine: ResumeAIEngine,
        semantic_ats_service: SemanticATSService,
        rag_service: RagService,
        job_search_service: JobSearchService,
    ):
        self.memory_service = memory_service
        self.profile_memory_service = profile_memory_service
        self.ai_engine = ai_engine
        self.semantic_ats_service = semantic_ats_service
        self.rag_service = rag_service
        self.job_search_service = job_search_service

    def reset_ai_session_context(self) -> Dict:
        """Clear transient AI context and reload only the compact persistent user profile."""

        profile_memory = self.profile_memory_service.load()
        session_context = self.ai_engine.reset_session_context(profile_memory.get("profile") or {})
        return {
            "username": profile_memory.get("username") or "ft",
            "profile_memory": profile_memory,
            "session_reset_at": session_context.get("session_reset_at"),
        }

    def seed_project_modules(self) -> None:
        """Register the scaffolded modules in memory.json once."""

        scaffold_items = [
            ("frontend_shell", "frontend", "frontend/", "Generated React + Tailwind local UI."),
            ("backend_api", "backend", "backend/", "Generated FastAPI backend and REST endpoints."),
            ("ai_modules", "ai", "ai_modules/", "Generated OpenAI and fallback logic."),
            ("project_docs", "docs", "README.md", "Generated local run guide and examples."),
            (
                "workflow_board::greenfield",
                "workflow",
                "frontend_app/src/App.jsx",
                "Saved the current no-resume greenfield workflow as a stable board.",
            ),
            (
                "workflow_board::existing_resume_optimize",
                "workflow",
                "frontend_app/src/App.jsx",
                "Saved the uploaded-resume job optimization workflow as a stable board.",
            ),
        ]
        for module_name, category, path, details in scaffold_items:
            self.memory_service.ensure_generated_module(module_name, category, path, details)

    def _build_status_event(
        self,
        *,
        phase: str,
        message: str,
        step: int,
        total_steps: int = 6,
        meta: Dict | None = None,
    ) -> Dict:
        return {
            "event": "status",
            "data": {
                "phase": phase,
                "message": message,
                "step": step,
                "total_steps": total_steps,
                "meta": meta or {},
            },
        }

    def _append_warning_note(self, result: Dict, warning: str) -> Dict:
        """Append one visible warning note without mutating the original result."""

        cleaned_warning = (warning or "").strip()
        if not cleaned_warning:
            return result

        next_result = dict(result)
        notes = list(next_result.get("analysis_notes") or [])
        if cleaned_warning not in notes:
            notes.append(cleaned_warning)
        next_result["analysis_notes"] = notes[:8]
        return next_result

    def _attach_web_context_to_profile(
        self,
        profile_payload: Dict,
        *,
        force_refresh: bool = False,
    ) -> Tuple[Dict, str]:
        """Inject network job context into a greenfield profile payload."""

        basic_info = profile_payload.get("basic_info", {}) or {}
        web_context, warning = self.job_search_service.build_prompt_context(
            target_company=basic_info.get("target_company", ""),
            target_role=basic_info.get("target_role", ""),
            job_requirements=basic_info.get("job_requirements", ""),
            force_refresh=force_refresh,
        )
        if not web_context:
            return profile_payload, warning

        enriched = dict(profile_payload)
        enriched["web_context"] = web_context
        return enriched, warning

    @staticmethod
    def _attach_template_guidance(payload: Dict, template_id: str = "") -> Dict:
        """Add deterministic template-capacity guidance for the text model."""

        if not template_id:
            return payload
        enriched = dict(payload)
        enriched["template_guidance"] = {
            "template_id": template_id,
            "file_strategy": "DOCX template fill",
            "rules": [
                "每段实习、工作或项目经历优先输出 3 条要点。",
                "每条要点尽量控制在 42 个中文字符左右，避免生成后挤出一页模板。",
                "没有事实依据的经历、奖项、证书、数字、公司、项目和时间不要写。",
                "没有对应经历时留空，由文件生成阶段删除该板块并上移后续内容。",
            ],
        }
        return enriched

    def _attach_web_context_to_existing_payload(
        self,
        payload: Dict,
        *,
        force_refresh: bool = False,
    ) -> Tuple[Dict, str]:
        """Inject network job context into uploaded-resume optimization payloads."""

        web_context, warning = self.job_search_service.build_prompt_context(
            target_company=payload.get("target_company", ""),
            target_role=payload.get("target_role", ""),
            job_requirements=payload.get("job_requirements", ""),
            force_refresh=force_refresh,
        )
        if not web_context:
            return payload, warning

        enriched = dict(payload)
        enriched["web_context"] = web_context
        return enriched, warning

    def generate_questions(self, profile: UserProfile) -> Dict:
        """Generate clarification questions from current profile information."""

        profile_payload, search_warning = self._attach_web_context_to_profile(profile.model_dump())
        result = self.ai_engine.generate_questions(profile_payload)
        if search_warning and not result.get("warning"):
            result["warning"] = search_warning
        self.memory_service.register_generation(
            {
                "event": "clarification_requested",
                "title": profile.basic_info.name or "未命名候选人",
                "membership_level": profile.membership_level,
                "modules": profile.modules,
                "resume_preview": " | ".join(result.get("questions", []))[:300],
                "used_ai": result.get("used_ai", False),
            }
        )
        return result

    def probe_model_status(self) -> Dict:
        """Return a live model availability snapshot for the frontend monitor."""

        return self.ai_engine.probe_model()

    def save_workspace_draft(self, draft_payload: Dict) -> Dict:
        """Save the current frontend workspace so it can be restored later."""

        return self.memory_service.save_workspace_draft(draft_payload)

    def score_semantic_ats(self, resume_text: str, job_description: str) -> Dict:
        """Return semantic ATS scoring with keyword feedback."""

        return self.semantic_ats_service.score(
            resume_text=resume_text,
            job_description=job_description,
        )

    def search_rag_references(self, query: str, top_k: int = 3) -> Dict:
        """Search the anonymized reference resume library."""

        return self.rag_service.search(query, top_k=top_k)

    def search_job_context(
        self,
        *,
        target_company: str,
        target_role: str,
        job_requirements: str,
        force_refresh: bool = False,
    ) -> Dict:
        """Search network job intelligence and return normalized results."""

        return self.job_search_service.search(
            target_company=target_company,
            target_role=target_role,
            job_requirements=job_requirements,
            force_refresh=force_refresh,
        )

    def delete_resume_snapshot(self, timestamp: str) -> bool:
        """Delete one saved resume snapshot."""

        return self.memory_service.delete_resume_snapshot(timestamp)

    def optimize_existing_resume(self, payload: Dict) -> Dict:
        """Optimize an uploaded resume for a target job."""

        payload = self._attach_template_guidance(payload, payload.get("template_id", ""))
        enriched_payload, search_warning = self._attach_web_context_to_existing_payload(payload)
        result = self.ai_engine.optimize_existing_resume(enriched_payload)
        result = self._append_warning_note(result, search_warning)
        profile_memory = self.profile_memory_service.sync_from_profile(
            {
                "basic_info": {
                    "target_company": payload.get("target_company", ""),
                    "target_role": payload.get("target_role", ""),
                    "job_requirements": payload.get("job_requirements", ""),
                    "city": "",
                },
                "skills": [],
                "education": [],
                "projects": [],
                "experiences": [],
                "use_full_information": False,
            },
            workflow="existing_resume",
        )
        self.ai_engine.update_persistent_profile_memory(profile_memory.get("profile") or {})
        self.memory_service.register_generation(
            {
                "event": "existing_resume_optimized",
                "title": result.get("title") or payload.get("target_role") or "已有简历优化",
                "target_company": payload.get("target_company", ""),
                "target_role": payload.get("target_role", ""),
                "resume_text": result.get("resume_text", ""),
                "generation_mode": result.get("mode", "fallback"),
                "analysis_notes": result.get("analysis_notes") or [],
                "used_ai": result.get("used_ai", False),
                "needs_clarification": result.get("needs_clarification", False),
            }
        )
        return result

    def stream_existing_resume(self, payload: Dict):
        """Stream uploaded-resume optimization events and register the final result."""

        payload = self._attach_template_guidance(payload, payload.get("template_id", ""))
        yield self._build_status_event(
            phase="search",
            message="正在联网检索岗位信息...",
            step=1,
        )
        enriched_payload, search_warning = self._attach_web_context_to_existing_payload(payload)
        yield self._build_status_event(
            phase="synthesize",
            message=(
                "已回退为仅基于 JD，正在整理岗位关键词..."
                if search_warning
                else "正在提炼岗位关键词与硬要求..."
            ),
            step=2,
            meta={"warning": search_warning} if search_warning else {},
        )

        for event in self.ai_engine.stream_existing_resume(enriched_payload):
            if event.get("event") == "final":
                result = self._append_warning_note(event.get("data") or {}, search_warning)
                yield self._build_status_event(
                    phase="score",
                    message="正在计算 ATS 与完成情况...",
                    step=5,
                    meta={"warning": search_warning} if search_warning else {},
                )
                yield self._build_status_event(
                    phase="complete",
                    message=(
                        "优化完成，因联网岗位情报不可用，本轮已回退为仅基于 JD。"
                        if search_warning
                        else "优化完成，结果已落地到工作台。"
                    ),
                    step=6,
                )
                profile_memory = self.profile_memory_service.sync_from_profile(
                    {
                        "basic_info": {
                            "target_company": payload.get("target_company", ""),
                            "target_role": payload.get("target_role", ""),
                            "job_requirements": payload.get("job_requirements", ""),
                            "city": "",
                        },
                        "skills": [],
                        "education": [],
                        "projects": [],
                        "experiences": [],
                        "use_full_information": False,
                    },
                    workflow="existing_resume",
                )
                self.ai_engine.update_persistent_profile_memory(profile_memory.get("profile") or {})
                self.memory_service.register_generation(
                    {
                        "event": "existing_resume_streamed",
                        "title": result.get("title") or payload.get("target_role") or "流式简历优化",
                        "target_company": payload.get("target_company", ""),
                        "target_role": payload.get("target_role", ""),
                        "resume_text": result.get("resume_text", ""),
                        "generation_mode": result.get("mode", "fallback"),
                        "analysis_notes": result.get("analysis_notes") or [],
                        "used_ai": result.get("used_ai", False),
                        "needs_clarification": result.get("needs_clarification", False),
                    }
                )
                yield {"event": "final", "data": result}
                continue
            yield event

    def save_resume_snapshot(self, payload: Dict) -> Dict:
        """Save the current left-side resume editor content as a snapshot."""

        return self.memory_service.save_resume_snapshot(payload)

    def stream_generate_resume(self, profile: UserProfile, template_id: str = ""):
        """Stream new-resume generation events and register the final result."""

        profile_payload = self._attach_template_guidance(profile.model_dump(), template_id)
        yield self._build_status_event(
            phase="search",
            message="正在联网检索岗位信息...",
            step=1,
        )
        enriched_payload, search_warning = self._attach_web_context_to_profile(profile_payload)
        yield self._build_status_event(
            phase="synthesize",
            message=(
                "已回退为仅基于 JD，正在整理岗位关键词..."
                if search_warning
                else "正在提炼岗位关键词与硬要求..."
            ),
            step=2,
            meta={"warning": search_warning} if search_warning else {},
        )

        for event in self.ai_engine.stream_generate_resume(enriched_payload):
            if event.get("event") == "final":
                result = self._append_warning_note(event.get("data") or {}, search_warning)
                yield self._build_status_event(
                    phase="score",
                    message="正在计算 ATS 与完成情况...",
                    step=5,
                    meta={"warning": search_warning} if search_warning else {},
                )
                yield self._build_status_event(
                    phase="complete",
                    message=(
                        "生成完成，因联网岗位情报不可用，本轮已回退为仅基于 JD。"
                        if search_warning
                        else "生成完成，结果已落地到工作台。"
                    ),
                    step=6,
                )
                profile_memory = self.profile_memory_service.sync_from_profile(
                    enriched_payload,
                    workflow="greenfield",
                )
                self.ai_engine.update_persistent_profile_memory(profile_memory.get("profile") or {})
                for module in profile.modules:
                    self.memory_service.ensure_generated_module(
                        module_name=f"resume_module::{module}",
                        category="resume_module",
                        path=f"generated::{module}",
                        details=f"Generated or refreshed resume module: {module}",
                    )
                self.memory_service.register_generation(
                    {
                        "event": "resume_streamed",
                        "title": result.get("title", profile.basic_info.name or "未命名简历"),
                        "target_company": getattr(profile.basic_info, "target_company", ""),
                        "target_role": profile.basic_info.target_role,
                        "resume_text": result.get("resume_text", ""),
                        "generation_mode": result.get("mode", "fallback"),
                        "analysis_notes": result.get("analysis_notes") or [],
                        "used_ai": result.get("used_ai", False),
                        "needs_clarification": result.get("needs_clarification", False),
                    }
                )
                yield {"event": "final", "data": result}
                continue
            yield event

    def generate_resume(self, profile: UserProfile, template_id: str = "") -> Dict:
        """Create a resume draft and register each selected module in memory."""

        profile_payload, search_warning = self._attach_web_context_to_profile(
            self._attach_template_guidance(profile.model_dump(), template_id)
        )
        result = self.ai_engine.generate_resume(profile_payload)
        result = self._append_warning_note(result, search_warning)
        profile_memory = self.profile_memory_service.sync_from_profile(
            profile_payload,
            workflow="greenfield",
        )
        self.ai_engine.update_persistent_profile_memory(profile_memory.get("profile") or {})
        for module in profile.modules:
            self.memory_service.ensure_generated_module(
                module_name=f"resume_module::{module}",
                category="resume_module",
                path=f"generated::{module}",
                details=f"Generated or refreshed resume module: {module}",
            )
        self.memory_service.register_generation(
            {
                "event": "resume_generated",
                "title": result.get("title", profile.basic_info.name or "未命名简历"),
                "target_company": getattr(profile.basic_info, "target_company", ""),
                "target_role": profile.basic_info.target_role,
                "resume_text": result.get("resume_text", ""),
                "generation_mode": result.get("mode", "fallback"),
                "analysis_notes": result.get("analysis_notes") or [],
                "used_ai": result.get("used_ai", False),
                "needs_clarification": result.get("needs_clarification", False),
            }
        )
        return result

    def revise_resume(self, profile: UserProfile, resume_text: str, instruction: str) -> Dict:
        """Update an existing resume draft based on user edits or extra AI instructions."""

        profile_payload, search_warning = self._attach_web_context_to_profile(profile.model_dump())
        result = self.ai_engine.revise_resume(
            profile_payload=profile_payload,
            resume_text=resume_text,
            instruction=instruction,
        )
        result = self._append_warning_note(result, search_warning)
        profile_memory = self.profile_memory_service.sync_from_profile(
            profile_payload,
            workflow="greenfield",
        )
        self.ai_engine.update_persistent_profile_memory(profile_memory.get("profile") or {})
        self.memory_service.register_generation(
            {
                "event": "resume_revised",
                "title": result.get("title", profile.basic_info.name or "未命名简历"),
                "target_company": getattr(profile.basic_info, "target_company", ""),
                "target_role": profile.basic_info.target_role,
                "resume_text": result.get("resume_text", ""),
                "generation_mode": result.get("mode", "fallback"),
                "analysis_notes": result.get("analysis_notes") or [],
                "used_ai": result.get("used_ai", False),
            }
        )
        return result

    def export_resume(self, resume_text: str, file_name: str, format_name: str) -> Dict:
        """Return export metadata and raw file bytes for frontend download."""

        safe_name = (file_name or "resume").strip().replace(" ", "_")
        if format_name == "txt":
            content = resume_text.encode("utf-8")
            media_type = "text/plain; charset=utf-8"
            suffix = "txt"
        else:
            content = resume_text.encode("utf-8")
            media_type = "text/markdown; charset=utf-8"
            suffix = "md"

        final_name = f"{safe_name}.{suffix}"
        self.memory_service.register_download(
            {
                "event": "resume_exported",
                "file_name": final_name,
                "format": format_name,
                "size_bytes": len(content),
                "resume_text": resume_text,
            }
        )
        return {
            "file_name": final_name,
            "media_type": media_type,
            "content": BytesIO(content),
        }
