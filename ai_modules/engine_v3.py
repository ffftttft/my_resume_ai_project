"""Strict structured-output AI engine built on Instructor and Pydantic contracts."""

from __future__ import annotations

import json
from typing import Dict, List

from ai_modules.engine_v2 import ResumeAIEngine as TightResumeAIEngine
from ai_modules.prompts import (
    build_existing_resume_messages,
    build_question_messages,
    build_resume_messages,
    build_revision_messages,
)
from ai_modules.structured_contracts import (
    ResumeGenerationResult,
    ResumeQuestionResult,
    ResumeRevisionResult,
    StructuredResume,
)


class ResumeAIEngine(TightResumeAIEngine):
    """Resume engine that validates model output before the UI ever sees it."""

    def _chunk_text(self, text: str, chunk_size: int = 96) -> List[str]:
        """Split a long string into smaller chunks for fallback streaming."""

        cleaned = text or ""
        return [cleaned[index : index + chunk_size] for index in range(0, len(cleaned), chunk_size)] or [""]

    def _recover_stream_result(self, raw_json: str) -> ResumeGenerationResult | None:
        """Best-effort parse for streamed JSON when SDK structured parsing returns empty."""

        cleaned = (raw_json or "").strip()
        if not cleaned:
            return None

        try:
            return ResumeGenerationResult.model_validate_json(cleaned)
        except Exception:
            pass

        try:
            return ResumeGenerationResult.model_validate(self._extract_json(cleaned))
        except Exception:
            return None

    def _merge_structured_resume(
        self,
        generated: StructuredResume,
        fallback: StructuredResume,
    ) -> StructuredResume:
        """Prefer model output, but backfill empty sections with deterministic data."""

        return StructuredResume(
            contact={
                "full_name": generated.contact.full_name or fallback.contact.full_name,
                "email": generated.contact.email or fallback.contact.email,
                "phone": generated.contact.phone or fallback.contact.phone,
                "city": generated.contact.city or fallback.contact.city,
                "target_company": generated.contact.target_company or fallback.contact.target_company,
                "target_role": generated.contact.target_role or fallback.contact.target_role,
            },
            summary=(generated.summary or fallback.summary).strip(),
            experience=generated.experience or fallback.experience,
            education=generated.education or fallback.education,
            skills=generated.skills or fallback.skills,
            projects=generated.projects or fallback.projects,
        )

    def _fallback_resume_result(
        self,
        profile_payload: Dict,
        fallback_questions: List[str],
        analysis_notes: List[str],
    ) -> Dict:
        """Build a consistent fallback response from structured local data."""

        structured_resume = self._structured_from_profile(profile_payload)
        return self._result_from_structured_resume(
            structured_resume,
            analysis_notes=analysis_notes,
            questions=fallback_questions,
            mode="fallback",
            used_ai=False,
        )

    def _fallback_existing_resume_result(self, payload: Dict, fallback_questions: List[str], note: str) -> Dict:
        """Build a fallback result for uploaded-resume optimization."""

        structured_resume = self._structured_from_existing_payload(payload)
        result = self._result_from_structured_resume(
            structured_resume,
            analysis_notes=[note],
            questions=fallback_questions,
            mode="fallback",
            used_ai=False,
            title=((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip(),
        )
        result["resume_text"] = self._plain_text((payload.get("resume_text") or "").strip())
        return result

    def generate_questions(self, profile_payload: Dict) -> Dict:
        """Generate compressed follow-up questions with a strict response schema."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        if not self.structured_client:
            return {
                "questions": fallback_questions,
                "detected_gaps": ["one_page_gap" for _ in fallback_questions],
                "ready_for_generation": len(fallback_questions) == 0,
                "used_ai": False,
            }

        try:
            result = self._call_structured(
                ResumeQuestionResult,
                build_question_messages(self._compress_profile(self._with_session_context(profile_payload))),
            )
            questions = self._clean_questions(
                result.questions,
                already_answered=self._has_answered_follow_up(profile_payload),
            )
            return {
                "questions": questions,
                "detected_gaps": result.detected_gaps,
                "ready_for_generation": len(questions) == 0,
                "used_ai": True,
            }
        except Exception as exc:
            return {
                "questions": fallback_questions,
                "detected_gaps": ["openai_error"],
                "ready_for_generation": len(fallback_questions) == 0,
                "used_ai": False,
                "warning": f"结构化追问生成失败：{exc}",
            }

    def generate_resume(self, profile_payload: Dict) -> Dict:
        """Generate a validated resume contract for the greenfield workflow."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        fallback_resume = self._structured_from_profile(profile_payload)

        if not self.structured_client:
            return self._fallback_resume_result(
                profile_payload,
                fallback_questions,
                ["当前启用本地兜底渲染，结构化契约已在本地生成。"],
            )

        try:
            result = self._call_structured(
                ResumeGenerationResult,
                build_resume_messages(self._compress_profile(self._with_session_context(profile_payload))),
            )
            questions = self._clean_questions(
                result.questions,
                already_answered=self._has_answered_follow_up(profile_payload),
            )
            structured_resume = self._merge_structured_resume(result.structured_resume, fallback_resume)
            analysis_notes = result.analysis_notes or []
            if not analysis_notes:
                analysis_notes = ["结构化输出已通过简历数据契约校验。"]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=questions,
                mode="openai",
                used_ai=True,
                title=result.title,
            )
        except Exception as exc:
            fallback = self._fallback_resume_result(
                profile_payload,
                fallback_questions,
                [f"结构化生成失败，系统已切换为本地兜底：{exc}"],
            )
            return fallback

    def stream_generate_resume(self, profile_payload: Dict):
        """Stream JSON deltas for greenfield resume generation and finish with a validated result."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        fallback_resume = self._structured_from_profile(profile_payload)
        fallback_title = self._title_from_structured_resume(fallback_resume)
        session_profile = self._compress_profile(self._with_session_context(profile_payload))

        yield {
            "event": "status",
            "data": {
                "phase": "schema",
                "message": "正在锁定简历数据契约，并准备流式生成提示词。",
            },
        }

        if not self.client:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=["OpenAI 当前不可用，系统已切换为本地结构化兜底流式输出。"],
            )
            raw_json = ""
            for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                raw_json += chunk
                yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}

            yield {
                "event": "final",
                "data": self._fallback_resume_result(
                    profile_payload,
                    fallback_questions,
                    ["当前启用本地兜底渲染，结构化契约已在本地生成。"],
                ),
            }
            return

        raw_json = ""

        try:
            yield {
                "event": "status",
                "data": {
                    "phase": "streaming",
                    "message": "模型正在流式返回结构化 JSON。",
                },
            }
            with self.client.responses.stream(
                model=self.model_name,
                input=build_resume_messages(session_profile),
                text_format=ResumeGenerationResult,
                temperature=0.2,
            ) as stream:
                for event in stream:
                    if getattr(event, "type", "") != "response.output_text.delta":
                        continue
                    delta = getattr(event, "delta", "") or ""
                    if not delta:
                        continue
                    raw_json += delta
                    yield {"event": "partial", "data": {"delta": delta, "raw_json": raw_json}}

                parsed_response = stream.get_final_response()

            parsed = parsed_response.output_parsed or self._recover_stream_result(
                raw_json or getattr(parsed_response, "output_text", "") or "",
            )
            if not parsed:
                raise ValueError("模型流式输出结束，但没有得到可解析的结构化结果。")

            questions = self._clean_questions(
                parsed.questions,
                already_answered=self._has_answered_follow_up(profile_payload),
            )
            structured_resume = self._merge_structured_resume(parsed.structured_resume, fallback_resume)
            analysis_notes = parsed.analysis_notes or ["结构化输出已通过简历数据契约校验。"]

            yield {
                "event": "final",
                "data": self._result_from_structured_resume(
                    structured_resume,
                    analysis_notes=analysis_notes,
                    questions=questions,
                    mode="openai",
                    used_ai=True,
                    title=parsed.title or fallback_title,
                ),
            }
        except Exception as exc:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=[f"流式生成失败，已切换为本地结构化兜底：{exc}"],
            )
            if not raw_json:
                for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                    raw_json += chunk
                    yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}
            yield {
                "event": "error",
                "data": {
                    "message": f"结构化流式生成失败，已启用本地兜底：{exc}",
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_resume_result(
                    profile_payload,
                    fallback_questions,
                    [f"结构化生成失败，系统已切换为本地兜底：{exc}"],
                ),
            }

    def revise_resume(self, profile_payload: Dict, resume_text: str, instruction: str) -> Dict:
        """Revise a draft while preserving a validated resume contract."""

        fallback_resume = self._structured_from_profile(profile_payload)
        fallback_title = self._title_from_structured_resume(fallback_resume)

        if not instruction.strip():
            result = self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=["未提供 AI 修订指令，系统已保留当前手动草稿。"],
                questions=[],
                mode="manual_preserve",
                used_ai=False,
                title=fallback_title,
            )
            result["resume_text"] = resume_text.strip()
            return result

        if not self.structured_client:
            result = self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=["AI 当前不可用，已保留现有草稿，修订指令未执行。"],
                questions=[],
                mode="fallback",
                used_ai=False,
                title=fallback_title,
            )
            result["resume_text"] = resume_text.strip()
            return result

        try:
            result = self._call_structured(
                ResumeRevisionResult,
                build_revision_messages(
                    self._compress_profile(self._with_session_context(profile_payload)),
                    resume_text,
                    instruction,
                ),
            )
            structured_resume = self._merge_structured_resume(result.structured_resume, fallback_resume)
            analysis_notes = result.analysis_notes or ["结构化修订结果已通过简历数据契约校验。"]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=[],
                mode="openai",
                used_ai=True,
                title=result.title or fallback_title,
            )
        except Exception as exc:
            result = self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=[f"结构化修订失败，已保留当前草稿：{exc}"],
                questions=[],
                mode="fallback",
                used_ai=False,
                title=fallback_title,
            )
            result["resume_text"] = resume_text.strip()
            return result

    def optimize_existing_resume(self, payload: Dict) -> Dict:
        """Optimize an uploaded resume and return a validated contract."""

        fallback_questions = self._dynamic_existing_resume_questions(payload)
        fallback_resume = self._structured_from_existing_payload(payload)
        fallback_title = ((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip()

        if not self.structured_client:
            return self._fallback_existing_resume_result(
                payload,
                fallback_questions,
                "当前启用本地兜底优化，结构化契约已根据上传文本生成。",
            )

        try:
            result = self._call_structured(
                ResumeGenerationResult,
                build_existing_resume_messages(
                    resume_text=(payload.get("resume_text") or "").strip(),
                    target_company=(payload.get("target_company") or "").strip(),
                    target_role=(payload.get("target_role") or "").strip(),
                    job_requirements=(payload.get("job_requirements") or "").strip(),
                    instruction=(payload.get("instruction") or "").strip(),
                    additional_answers=payload.get("additional_answers") or [],
                    persistent_profile_memory=self.session_context.get("persistent_profile_memory") or {},
                ),
            )
            questions = self._clean_questions(
                result.questions,
                already_answered=self._has_answered_follow_up(payload),
            )
            structured_resume = self._merge_structured_resume(result.structured_resume, fallback_resume)
            analysis_notes = result.analysis_notes or ["Uploaded resume was normalized into the strict resume contract."]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=questions,
                mode="openai",
                used_ai=True,
                title=result.title or fallback_title,
            )
        except Exception as exc:
            return self._fallback_existing_resume_result(
                payload,
                fallback_questions,
                f"结构化优化失败，系统已切换为本地兜底：{exc}",
            )

    def stream_existing_resume(self, payload: Dict):
        """Stream JSON deltas for uploaded-resume optimization and finish with a validated result."""

        fallback_questions = self._dynamic_existing_resume_questions(payload)
        fallback_resume = self._structured_from_existing_payload(payload)
        fallback_title = ((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip()

        yield {
            "event": "status",
            "data": {
                "phase": "schema",
                "message": "正在锁定简历数据契约，并准备流式生成提示词。",
            },
        }

        if not self.client:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=["OpenAI 当前不可用，系统已切换为本地结构化兜底流式输出。"],
            )
            raw_json = ""
            for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                raw_json += chunk
                yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}

            yield {
                "event": "final",
                "data": self._fallback_existing_resume_result(
                    payload,
                    fallback_questions,
                    "当前使用本地兜底优化，结构化契约已根据上传简历内容生成。",
                ),
            }
            return

        raw_json = ""

        try:
            yield {
                "event": "status",
                "data": {
                    "phase": "streaming",
                    "message": "模型正在流式返回结构化 JSON。",
                },
            }
            with self.client.responses.stream(
                model=self.model_name,
                input=build_existing_resume_messages(
                    resume_text=(payload.get("resume_text") or "").strip(),
                    target_company=(payload.get("target_company") or "").strip(),
                    target_role=(payload.get("target_role") or "").strip(),
                    job_requirements=(payload.get("job_requirements") or "").strip(),
                    instruction=(payload.get("instruction") or "").strip(),
                    additional_answers=payload.get("additional_answers") or [],
                    persistent_profile_memory=self.session_context.get("persistent_profile_memory") or {},
                ),
                text_format=ResumeGenerationResult,
                temperature=0.2,
            ) as stream:
                for event in stream:
                    if getattr(event, "type", "") != "response.output_text.delta":
                        continue
                    delta = getattr(event, "delta", "") or ""
                    if not delta:
                        continue
                    raw_json += delta
                    yield {"event": "partial", "data": {"delta": delta, "raw_json": raw_json}}

                parsed_response = stream.get_final_response()

            parsed = parsed_response.output_parsed or self._recover_stream_result(
                raw_json or getattr(parsed_response, "output_text", "") or "",
            )
            if not parsed:
                raise ValueError("模型流式输出结束，但没有得到可解析的结构化结果。")

            questions = self._clean_questions(
                parsed.questions,
                already_answered=self._has_answered_follow_up(payload),
            )
            structured_resume = self._merge_structured_resume(parsed.structured_resume, fallback_resume)
            analysis_notes = parsed.analysis_notes or ["上传简历已被规范化为严格的结构化简历契约。"]

            yield {
                "event": "final",
                "data": self._result_from_structured_resume(
                    structured_resume,
                    analysis_notes=analysis_notes,
                    questions=questions,
                    mode="openai",
                    used_ai=True,
                    title=parsed.title or fallback_title,
                ),
            }
        except Exception as exc:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=[f"流式生成失败，已切换为本地结构化兜底：{exc}"],
            )
            if not raw_json:
                for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                    raw_json += chunk
                    yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}
            yield {
                "event": "error",
                "data": {
                    "message": f"结构化流式生成失败，已启用本地兜底：{exc}",
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_existing_resume_result(
                    payload,
                    fallback_questions,
                    f"结构化流式生成失败，系统已切换为本地兜底：{exc}",
                ),
            }
