"""Application service that connects FastAPI requests with AI generation logic."""

from __future__ import annotations

from io import BytesIO
from typing import Dict

from ai_modules.engine_v2 import ResumeAIEngine
from app.models import UserProfile

from .memory_service import MemoryService


class ResumeService:
    """Orchestrates generation, revision, export, and memory updates."""

    def __init__(self, memory_service: MemoryService, ai_engine: ResumeAIEngine):
        self.memory_service = memory_service
        self.ai_engine = ai_engine

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

    def generate_questions(self, profile: UserProfile) -> Dict:
        """Generate clarification questions from current profile information."""

        result = self.ai_engine.generate_questions(profile.model_dump())
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

    def delete_resume_snapshot(self, timestamp: str) -> bool:
        """Delete one saved resume snapshot."""

        return self.memory_service.delete_resume_snapshot(timestamp)

    def optimize_existing_resume(self, payload: Dict) -> Dict:
        """Optimize an uploaded resume for a target job."""

        result = self.ai_engine.optimize_existing_resume(payload)
        self.memory_service.register_generation(
            {
                "event": "existing_resume_optimized",
                "title": result.get("title") or payload.get("target_role") or "已有简历优化",
                "target_company": payload.get("target_company", ""),
                "target_role": payload.get("target_role", ""),
                "resume_text": result.get("resume_text", ""),
                "generation_mode": result.get("mode", "fallback"),
                "used_ai": result.get("used_ai", False),
                "needs_clarification": result.get("needs_clarification", False),
            }
        )
        return result

    def save_resume_snapshot(self, payload: Dict) -> Dict:
        """Save the current left-side resume editor content as a snapshot."""

        return self.memory_service.save_resume_snapshot(payload)

    def generate_resume(self, profile: UserProfile) -> Dict:
        """Create a resume draft and register each selected module in memory."""

        result = self.ai_engine.generate_resume(profile.model_dump())
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
                "used_ai": result.get("used_ai", False),
                "needs_clarification": result.get("needs_clarification", False),
            }
        )
        return result

    def revise_resume(self, profile: UserProfile, resume_text: str, instruction: str) -> Dict:
        """Update an existing resume draft based on user edits or extra AI instructions."""

        result = self.ai_engine.revise_resume(
            profile_payload=profile.model_dump(),
            resume_text=resume_text,
            instruction=instruction,
        )
        self.memory_service.register_generation(
            {
                "event": "resume_revised",
                "title": result.get("title", profile.basic_info.name or "未命名简历"),
                "target_company": getattr(profile.basic_info, "target_company", ""),
                "target_role": profile.basic_info.target_role,
                "resume_text": result.get("resume_text", ""),
                "generation_mode": result.get("mode", "fallback"),
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
