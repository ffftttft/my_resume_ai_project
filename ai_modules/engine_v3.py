"""Strict structured-output AI engine built on Instructor and Pydantic contracts."""

from __future__ import annotations

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

    def _revision_fallback_resume(self, profile_payload: Dict, resume_text: str) -> StructuredResume:
        """Build a deterministic fallback contract for manual edits or failed revisions."""

        profile_resume = self._structured_from_profile(profile_payload)
        basic_info = profile_payload.get("basic_info", {})
        text_resume = self._structured_from_existing_payload(
            {
                "resume_text": resume_text,
                "target_company": basic_info.get("target_company", ""),
                "target_role": basic_info.get("target_role", ""),
            }
        )
        return self._merge_structured_resume(text_resume, profile_resume)

    def _fallback_resume_result(
        self,
        profile_payload: Dict,
        fallback_questions: List[str],
        analysis_notes: List[str],
        warning: str = "",
    ) -> Dict:
        """Build a consistent fallback response from structured local data."""

        structured_resume = self._structured_from_profile(profile_payload)
        return self._result_from_structured_resume(
            structured_resume,
            analysis_notes=analysis_notes,
            questions=fallback_questions,
            mode="fallback",
            used_ai=False,
            contract_source="fallback",
            llm_contract_ok=False,
            warning=warning or (analysis_notes[0] if analysis_notes else ""),
        )

    def _fallback_existing_resume_result(
        self,
        payload: Dict,
        fallback_questions: List[str],
        note: str,
        warning: str = "",
    ) -> Dict:
        """Build a fallback result for uploaded-resume optimization."""

        structured_resume = self._structured_from_existing_payload(payload)
        return self._result_from_structured_resume(
            structured_resume,
            analysis_notes=[note],
            questions=fallback_questions,
            mode="fallback",
            used_ai=False,
            title=((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip(),
            contract_source="fallback",
            llm_contract_ok=False,
            warning=warning or note,
        )

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
                "warning": f"Structured question generation failed: {exc}",
            }

    def generate_resume(self, profile_payload: Dict) -> Dict:
        """Generate a validated resume contract for the greenfield workflow."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        fallback_resume = self._structured_from_profile(profile_payload)

        if not self.structured_client:
            return self._fallback_resume_result(
                profile_payload,
                fallback_questions,
                ["OpenAI is unavailable, so the workspace rendered a local structured fallback."],
                warning="Structured model output unavailable. Local contract fallback used.",
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
            analysis_notes = result.analysis_notes or ["Structured resume output passed contract validation."]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=questions,
                mode="openai",
                used_ai=True,
                title=result.title,
                contract_source="model",
                llm_contract_ok=True,
                warning="",
            )
        except Exception as exc:
            return self._fallback_resume_result(
                profile_payload,
                fallback_questions,
                [f"Structured resume generation failed, so the system fell back to a local contract: {exc}"],
                warning=f"Structured response validation failed: {exc}",
            )

    def stream_generate_resume(self, profile_payload: Dict):
        """Stream JSON deltas for greenfield resume generation and finish with a validated result."""

        fallback_questions = self._dynamic_gap_questions(profile_payload)
        fallback_resume = self._structured_from_profile(profile_payload)
        fallback_title = self._title_from_structured_resume(fallback_resume)
        session_profile = self._compress_profile(self._with_session_context(profile_payload))

        yield {
            "event": "status",
            "data": {
                "phase": "draft",
                "message": "正在生成结构化简历草稿...",
                "step": 3,
                "total_steps": 6,
                "meta": {},
            },
        }

        if not self.client:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=["OpenAI is unavailable, so a local structured fallback was streamed instead."],
            )
            raw_json = ""
            for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                raw_json += chunk
                yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}

            yield {
                "event": "status",
                "data": {
                    "phase": "validate",
                    "message": "正在校验结构化结果...",
                    "step": 4,
                    "total_steps": 6,
                    "meta": {},
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_resume_result(
                    profile_payload,
                    fallback_questions,
                    ["OpenAI is unavailable, so the workspace rendered a local structured fallback."],
                    warning="Structured model output unavailable. Local contract fallback used.",
                ),
            }
            return

        raw_json = ""

        try:
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
                raise ValueError("The model stream finished without a valid structured result.")

            yield {
                "event": "status",
                "data": {
                    "phase": "validate",
                    "message": "正在校验结构化结果...",
                    "step": 4,
                    "total_steps": 6,
                    "meta": {},
                },
            }
            questions = self._clean_questions(
                parsed.questions,
                already_answered=self._has_answered_follow_up(profile_payload),
            )
            structured_resume = self._merge_structured_resume(parsed.structured_resume, fallback_resume)
            analysis_notes = parsed.analysis_notes or ["Structured stream output passed contract validation."]

            yield {
                "event": "final",
                "data": self._result_from_structured_resume(
                    structured_resume,
                    analysis_notes=analysis_notes,
                    questions=questions,
                    mode="openai",
                    used_ai=True,
                    title=parsed.title or fallback_title,
                    contract_source="model",
                    llm_contract_ok=True,
                    warning="",
                ),
            }
        except Exception as exc:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=[f"Structured stream generation failed, so the system fell back locally: {exc}"],
            )
            if not raw_json:
                for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                    raw_json += chunk
                    yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}
            yield {
                "event": "error",
                "data": {
                    "message": f"Structured stream generation failed, local fallback enabled: {exc}",
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_resume_result(
                    profile_payload,
                    fallback_questions,
                    [f"Structured resume generation failed, so the system fell back to a local contract: {exc}"],
                    warning=f"Structured response validation failed: {exc}",
                ),
            }

    def revise_resume(self, profile_payload: Dict, resume_text: str, instruction: str) -> Dict:
        """Revise a draft while preserving a validated resume contract."""

        fallback_resume = self._revision_fallback_resume(profile_payload, resume_text)
        fallback_title = self._title_from_structured_resume(fallback_resume)

        if not instruction.strip():
            return self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=["No AI revision instruction was provided, so the current draft was preserved through the local contract renderer."],
                questions=[],
                mode="manual_preserve",
                used_ai=False,
                title=fallback_title,
                contract_source="fallback",
                llm_contract_ok=False,
                warning="Revision skipped because no AI instruction was provided.",
            )

        if not self.structured_client:
            return self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=["OpenAI is unavailable, so the current draft was preserved through the local contract renderer."],
                questions=[],
                mode="fallback",
                used_ai=False,
                title=fallback_title,
                contract_source="fallback",
                llm_contract_ok=False,
                warning="Structured revision unavailable. Local contract fallback used.",
            )

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
            analysis_notes = result.analysis_notes or ["Structured revision output passed contract validation."]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=[],
                mode="openai",
                used_ai=True,
                title=result.title or fallback_title,
                contract_source="model",
                llm_contract_ok=True,
                warning="",
            )
        except Exception as exc:
            return self._result_from_structured_resume(
                fallback_resume,
                analysis_notes=[f"Structured revision failed, so the workspace kept a local contract version of the draft: {exc}"],
                questions=[],
                mode="fallback",
                used_ai=False,
                title=fallback_title,
                contract_source="fallback",
                llm_contract_ok=False,
                warning=f"Structured revision validation failed: {exc}",
            )

    def optimize_existing_resume(self, payload: Dict) -> Dict:
        """Optimize an uploaded resume and return a validated contract."""

        fallback_questions = self._dynamic_existing_resume_questions(payload)
        fallback_resume = self._structured_from_existing_payload(payload)
        fallback_title = ((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip()

        if not self.structured_client:
            return self._fallback_existing_resume_result(
                payload,
                fallback_questions,
                "OpenAI is unavailable, so the uploaded resume was normalized through the local contract renderer.",
                warning="Structured model output unavailable. Local contract fallback used.",
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
                    web_context=payload.get("web_context") or [],
                ),
            )
            questions = self._clean_questions(
                result.questions,
                already_answered=self._has_answered_follow_up(payload),
            )
            structured_resume = self._merge_structured_resume(result.structured_resume, fallback_resume)
            analysis_notes = result.analysis_notes or ["Uploaded resume output passed strict contract validation."]
            return self._result_from_structured_resume(
                structured_resume,
                analysis_notes=analysis_notes,
                questions=questions,
                mode="openai",
                used_ai=True,
                title=result.title or fallback_title,
                contract_source="model",
                llm_contract_ok=True,
                warning="",
            )
        except Exception as exc:
            return self._fallback_existing_resume_result(
                payload,
                fallback_questions,
                f"Structured optimization failed, so the uploaded resume was normalized locally: {exc}",
                warning=f"Structured response validation failed: {exc}",
            )

    def stream_existing_resume(self, payload: Dict):
        """Stream JSON deltas for uploaded-resume optimization and finish with a validated result."""

        fallback_questions = self._dynamic_existing_resume_questions(payload)
        fallback_resume = self._structured_from_existing_payload(payload)
        fallback_title = ((payload.get("target_company") or "").strip() + " " + (payload.get("target_role") or "").strip()).strip()

        yield {
            "event": "status",
            "data": {
                "phase": "draft",
                "message": "正在重写并优化结构化简历...",
                "step": 3,
                "total_steps": 6,
                "meta": {},
            },
        }

        if not self.client:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=["OpenAI is unavailable, so a local structured fallback was streamed instead."],
            )
            raw_json = ""
            for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                raw_json += chunk
                yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}

            yield {
                "event": "status",
                "data": {
                    "phase": "validate",
                    "message": "正在校验结构化结果...",
                    "step": 4,
                    "total_steps": 6,
                    "meta": {},
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_existing_resume_result(
                    payload,
                    fallback_questions,
                    "OpenAI is unavailable, so the uploaded resume was normalized through the local contract renderer.",
                    warning="Structured model output unavailable. Local contract fallback used.",
                ),
            }
            return

        raw_json = ""

        try:
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
                    web_context=payload.get("web_context") or [],
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
                raise ValueError("The model stream finished without a valid structured result.")

            yield {
                "event": "status",
                "data": {
                    "phase": "validate",
                    "message": "正在校验结构化结果...",
                    "step": 4,
                    "total_steps": 6,
                    "meta": {},
                },
            }
            questions = self._clean_questions(
                parsed.questions,
                already_answered=self._has_answered_follow_up(payload),
            )
            structured_resume = self._merge_structured_resume(parsed.structured_resume, fallback_resume)
            analysis_notes = parsed.analysis_notes or ["Uploaded resume stream output passed strict contract validation."]

            yield {
                "event": "final",
                "data": self._result_from_structured_resume(
                    structured_resume,
                    analysis_notes=analysis_notes,
                    questions=questions,
                    mode="openai",
                    used_ai=True,
                    title=parsed.title or fallback_title,
                    contract_source="model",
                    llm_contract_ok=True,
                    warning="",
                ),
            }
        except Exception as exc:
            fallback_generation = ResumeGenerationResult(
                title=fallback_title,
                structured_resume=fallback_resume,
                questions=fallback_questions,
                analysis_notes=[f"Structured optimization stream failed, so the system fell back locally: {exc}"],
            )
            if not raw_json:
                for chunk in self._chunk_text(fallback_generation.model_dump_json(), chunk_size=120):
                    raw_json += chunk
                    yield {"event": "partial", "data": {"delta": chunk, "raw_json": raw_json}}
            yield {
                "event": "error",
                "data": {
                    "message": f"Structured optimization stream failed, local fallback enabled: {exc}",
                },
            }
            yield {
                "event": "final",
                "data": self._fallback_existing_resume_result(
                    payload,
                    fallback_questions,
                    f"Structured optimization failed, so the uploaded resume was normalized locally: {exc}",
                    warning=f"Structured response validation failed: {exc}",
                ),
            }
