"""Regression tests for phase-one structured contract hardening."""

from __future__ import annotations

import unittest

from pydantic import ValidationError

from ai_modules.engine import ResumeAIEngine
from ai_modules.structured_contracts import ResumeGenerationResult, StructuredResume
from ai_modules.structured_renderer import render_resume_markdown
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

    def test_generate_request_accepts_awards_and_keeps_legacy_payloads_optional(self) -> None:
        legacy_payload = {
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
        legacy_request = GenerateResumeRequest.model_validate(legacy_payload)

        self.assertEqual(legacy_request.profile.awards, [])

        payload_with_awards = {
            "profile": {
                **legacy_payload["profile"],
                "awards": [
                    {
                        "award_name": "课程优秀奖学金",
                        "date": "2025-06",
                        "level": "校级",
                        "issuer": "长安大学",
                        "description": "基础课成绩位列本校前 10%。",
                    }
                ],
            }
        }
        request = GenerateResumeRequest.model_validate(payload_with_awards)
        structured_resume = ResumeAIEngine()._structured_from_profile(request.profile.model_dump())

        self.assertEqual(request.profile.awards[0].award_name, "课程优秀奖学金")
        self.assertEqual(request.profile.awards[0].date, "2025-06")
        self.assertEqual(structured_resume.awards[0].award_name, "课程优秀奖学金")

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

    def test_markdown_renders_sections_in_resume_layout_order(self) -> None:
        structured_resume = StructuredResume(
            contact={
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "13800000000",
                "city": "杭州",
                "target_company": "巨子生物",
                "target_role": "数据分析师",
            },
            summary="具备数据分析与业务洞察能力。",
            experience=[
                {
                    "company_name": "Example Co",
                    "job_title": "数据分析实习生",
                    "start_date": "2025-06",
                    "end_date": "2025-09",
                    "role_scope": "负责数据清洗与看板维护。",
                    "achievements": ["搭建一套周报指标看板。"],
                    "tools": ["Python"],
                }
            ],
            education=[
                {
                    "school_name": "长安大学",
                    "degree": "本科",
                    "major": "数据科学与大数据技术",
                    "start_date": "2022-09",
                    "end_date": "2026-06",
                    "highlights": ["GPA 3.7/4.0"],
                }
            ],
            skills=[{"category": "编程语言", "items": ["Python", "SQL"]}],
            projects=[
                {
                    "project_name": "用户行为分析项目",
                    "role": "项目负责人",
                    "start_date": "2025-02",
                    "end_date": "2025-05",
                    "project_summary": "分析用户行为路径。",
                    "achievements": ["完成路径转化分析。"],
                    "tools": ["Excel"],
                }
            ],
            awards=[
                {
                    "award_name": "课程优秀奖学金",
                    "date": "2025-06",
                    "level": "校级",
                    "issuer": "长安大学",
                    "description": "基础课成绩位列本校前 10%。",
                }
            ],
        )

        markdown = render_resume_markdown(structured_resume)
        headings = [line for line in markdown.splitlines() if line.startswith("## ")]

        self.assertEqual(
            headings,
            ["## 个人信息", "## 实习经历", "## 项目经历", "## 获奖经历", "## 个人技能", "## 个人总结"],
        )
        self.assertNotIn("## 教育背景", markdown)

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
        self.assertEqual(result["contract_report"]["section_counts"]["awards"], 0)


if __name__ == "__main__":
    unittest.main()
