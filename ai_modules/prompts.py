"""Prompt builders used by the resume AI engine."""

from __future__ import annotations

import json
from typing import Dict


RESUME_SYSTEM_PROMPT = """
You are a senior Chinese resume writer for a local prototype application.
Write concise, ATS-friendly Chinese resumes.
Always focus on measurable impact, clarity, and realistic wording.
When the input still has gaps, ask at most 3 highly-compressed follow-up questions total.
Prioritize in this order:
1. missing modules or role-common required skills,
2. the single most relevant project or experience,
3. metrics/evidence only if still necessary.
Each question must cover multiple related subtopics in one question so the user can answer everything on one page.
If additional_answers already exist, do not ask any more questions and directly finish the resume.
Return valid JSON only without markdown fences.
""".strip()


QUESTION_SYSTEM_PROMPT = """
You find missing information inside a Chinese resume form.
Return valid JSON only without markdown fences.
Ask at most 3 highly-compressed questions total.
Prioritize missing modules or role-common required skills first, then ask about the single most relevant project or experience.
Each question should combine related missing points, instead of splitting them into many tiny questions.
If additional_answers already exist, return an empty questions array.
""".strip()


REVISION_SYSTEM_PROMPT = """
You revise an existing Chinese resume draft based on user instructions.
Return valid JSON only without markdown fences.
Do not invent facts that are not supported by the input.
""".strip()


EXISTING_RESUME_SYSTEM_PROMPT = """
You optimize an uploaded Chinese resume for a target company, role, and job requirements.
Return valid JSON only without markdown fences.
Keep the resume in clean Chinese plain text with clear section breaks, not markdown symbols.
If the current resume lacks evidence needed for the target role, ask at most 3 highly-compressed follow-up questions total.
Prioritize role-common required skills first, then the single most relevant experience, then metrics/evidence if still necessary.
Each question must cover multiple related subtopics in one question so the user can answer everything on one page.
If additional_answers already exist, do not ask any more questions and directly finish the optimization.
Do not invent facts that are not supported by the uploaded resume or user answers.
""".strip()


def build_resume_input(profile_payload: Dict) -> str:
    """Build the JSON payload sent to the model for resume generation."""

    return json.dumps(
        {
            "task": "generate_resume",
            "expected_json_schema": {
                "title": "string",
                "resume_text": "string",
                "questions": ["string"],
                "analysis_notes": ["string"],
            },
            "instructions": [
                "Use Chinese.",
                "Generate the resume in markdown text.",
                "Respect the selected modules and membership level.",
                "Ask at most 3 questions total.",
                "Prioritize missing modules or role-common required skills first.",
                "Then ask about the single most relevant project or experience in one compressed question.",
                "If additional_answers is not empty, do not ask more questions.",
                "If details are sufficient, return an empty questions array.",
            ],
            "profile_payload": profile_payload,
        },
        ensure_ascii=False,
        indent=2,
    )


def build_questions_input(profile_payload: Dict) -> str:
    """Build the JSON payload sent to the model for clarification questions."""

    return json.dumps(
        {
            "task": "generate_clarification_questions",
            "expected_json_schema": {
                "questions": ["string"],
                "detected_gaps": ["string"],
            },
            "instructions": [
                "Return at most 3 questions total.",
                "Prioritize missing modules or role-common required skills first.",
                "Then ask about the single most relevant project or experience.",
                "Each question should combine responsibility, actions, tools, and results when possible.",
                "If additional_answers is not empty, return an empty questions array.",
            ],
            "profile_payload": profile_payload,
        },
        ensure_ascii=False,
        indent=2,
    )


def build_revision_input(profile_payload: Dict, resume_text: str, instruction: str) -> str:
    """Build the JSON payload sent to the model for resume revision."""

    return json.dumps(
        {
            "task": "revise_resume",
            "expected_json_schema": {
                "title": "string",
                "resume_text": "string",
                "analysis_notes": ["string"],
            },
            "instructions": [
                "Preserve facts already present in the draft.",
                "Apply the user instruction carefully.",
                "Keep the final resume in Chinese markdown.",
            ],
            "revision_instruction": instruction,
            "current_resume_text": resume_text,
            "profile_payload": profile_payload,
        },
        ensure_ascii=False,
        indent=2,
    )


def build_existing_resume_input(
    resume_text: str,
    target_company: str,
    target_role: str,
    job_requirements: str,
    instruction: str,
    additional_answers: list[Dict],
) -> str:
    """Build the payload sent to the model for existing-resume optimization."""

    return json.dumps(
        {
            "task": "optimize_existing_resume",
            "expected_json_schema": {
                "title": "string",
                "resume_text": "string",
                "questions": ["string"],
                "analysis_notes": ["string"],
            },
            "instructions": [
                "Use Chinese.",
                "Return clean plain text instead of markdown symbols.",
                "Align the resume toward the target company, role, and job requirements.",
                "Ask at most 3 questions total.",
                "Prioritize role-common required skills first.",
                "Then ask about the single most relevant experience in one compressed question.",
                "If additional_answers is not empty, do not ask more questions.",
            ],
            "resume_text": resume_text,
            "target_company": target_company,
            "target_role": target_role,
            "job_requirements": job_requirements,
            "revision_instruction": instruction,
            "additional_answers": additional_answers,
        },
        ensure_ascii=False,
        indent=2,
    )
