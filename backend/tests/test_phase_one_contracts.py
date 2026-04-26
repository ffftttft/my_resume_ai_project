"""Regression tests for phase-one structured contract hardening."""

from __future__ import annotations

import unittest

from pydantic import ValidationError

from ai_modules.engine import ResumeAIEngine
from ai_modules.structured_contracts import ResumeGenerationResult, StructuredResume
from backend.app.models import GenerateResumeRequest


class PhaseOneContractTests(unittest.TestCase):
    """Verify strict request parsing and workspace contract metadata."""

    def test_generate_request_rejects_unknown_fields(self) -> None:
        payload = {
            "profile": {
                "basic_info": {
                    "name": "Test User",
                    "target_company": "OpenAI",
                    "target_role": "Backend Engineer",
                    "job_requirements": "Python, APIs, testing",
                    "email": "",
                    "phone": "",
                    "city": "",
                    "summary": "",
                    "unexpected": "boom",
                },
                "skills": ["Python"],
                "education": [],
                "experiences": [],
                "projects": [],
                "modules": ["summary", "skills"],
                "membership_level": "basic",
                "use_full_information": False,
                "uploaded_context": "",
                "additional_answers": [],
            }
        }

        with self.assertRaises(ValidationError):
            GenerateResumeRequest.model_validate(payload)

    def test_structured_result_rejects_unknown_fields(self) -> None:
        payload = {
            "title": "Test Draft",
            "structured_resume": {
                "contact": {
                    "full_name": "Test User",
                    "email": "",
                    "phone": "",
                    "city": "",
                    "target_company": "OpenAI",
                    "target_role": "Backend Engineer",
                },
                "summary": "Grounded summary",
                "experience": [],
                "education": [],
                "skills": [],
                "projects": [],
            },
            "questions": [],
            "analysis_notes": [],
            "unexpected": True,
        }

        with self.assertRaises(ValidationError):
            ResumeGenerationResult.model_validate(payload)

    def test_structured_result_normalizes_chinese_month_range(self) -> None:
        payload = {
            "title": "Test Draft",
            "structured_resume": {
                "contact": {
                    "full_name": "Test User",
                    "email": "",
                    "phone": "",
                    "city": "",
                    "target_company": "OpenAI",
                    "target_role": "Backend Engineer",
                },
                "summary": "Grounded summary",
                "experience": [
                    {
                        "company_name": "Example Co",
                        "job_title": "Intern",
                        "start_date": "2025年12月- 2026年03月",
                        "end_date": "",
                        "role_scope": "",
                        "achievements": ["Built one internal tool."],
                        "tools": ["Python"],
                    }
                ],
                "education": [],
                "skills": [],
                "projects": [],
            },
            "questions": [],
            "analysis_notes": [],
        }

        result = ResumeGenerationResult.model_validate(payload)
        experience = result.structured_resume.experience[0]

        self.assertEqual(experience.start_date, "2025-12")
        self.assertEqual(experience.end_date, "2026-03")

    def test_structured_result_normalizes_open_ended_month_range(self) -> None:
        payload = {
            "title": "Test Draft",
            "structured_resume": {
                "contact": {
                    "full_name": "Test User",
                    "email": "",
                    "phone": "",
                    "city": "",
                    "target_company": "OpenAI",
                    "target_role": "Backend Engineer",
                },
                "summary": "Grounded summary",
                "experience": [
                    {
                        "company_name": "Example Co",
                        "job_title": "Intern",
                        "start_date": "2025年12月 - 至今",
                        "end_date": "",
                        "role_scope": "",
                        "achievements": ["Built one internal tool."],
                        "tools": ["Python"],
                    }
                ],
                "education": [],
                "skills": [],
                "projects": [],
            },
            "questions": [],
            "analysis_notes": [],
        }

        result = ResumeGenerationResult.model_validate(payload)
        experience = result.structured_resume.experience[0]

        self.assertEqual(experience.start_date, "2025-12")
        self.assertEqual(experience.end_date, "Present")

    def test_contract_report_captures_source_and_warning(self) -> None:
        engine = ResumeAIEngine()
        structured_resume = StructuredResume(
            contact={
                "full_name": "Test User",
                "email": "",
                "phone": "",
                "city": "",
                "target_company": "OpenAI",
                "target_role": "Backend Engineer",
            },
            summary="Grounded summary",
            experience=[],
            education=[],
            skills=[],
            projects=[],
        )

        result = engine._result_from_structured_resume(
            structured_resume,
            analysis_notes=["Fallback applied."],
            questions=["Need one metric."],
            mode="fallback",
            used_ai=False,
            title="Fallback Draft",
            contract_source="fallback",
            llm_contract_ok=False,
            warning="Structured response validation failed.",
        )

        self.assertEqual(result["contract_report"]["schema_version"], "v2")
        self.assertEqual(result["contract_report"]["source"], "fallback")
        self.assertFalse(result["contract_report"]["llm_contract_ok"])
        self.assertEqual(result["contract_report"]["warning"], "Structured response validation failed.")


if __name__ == "__main__":
    unittest.main()
