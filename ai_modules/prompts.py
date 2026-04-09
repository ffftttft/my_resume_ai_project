"""Prompt builders used by the resume AI engine."""

from __future__ import annotations

import json
from typing import Dict


RESUME_SYSTEM_PROMPT = """
You are a senior Chinese resume writer for a local prototype application.
Write concise, ATS-friendly Chinese resumes.
Always focus on measurable impact, clarity, and realistic wording.
If persistent_profile_memory is provided, treat it as the only allowed carry-over memory from previous website sessions.
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
If persistent_profile_memory is provided, use it as the only allowed long-term user memory.
Ask at most 3 highly-compressed questions total.
Prioritize missing modules or role-common required skills first, then ask about the single most relevant project or experience.
Each question should combine related missing points, instead of splitting them into many tiny questions.
If additional_answers already exist, return an empty questions array.
""".strip()


REVISION_SYSTEM_PROMPT = """
You revise an existing Chinese resume draft based on user instructions.
Return valid JSON only without markdown fences.
If persistent_profile_memory is provided, use it as the only allowed long-term user memory.
Do not invent facts that are not supported by the input.
""".strip()


EXISTING_RESUME_SYSTEM_PROMPT = """
You optimize an uploaded Chinese resume for a target company, role, and job requirements.
Return valid JSON only without markdown fences.
If persistent_profile_memory is provided, treat it as the only allowed carry-over memory from previous website sessions.
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
    persistent_profile_memory: Dict | None = None,
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
            "persistent_profile_memory": persistent_profile_memory or {},
        },
        ensure_ascii=False,
        indent=2,
    )


STRICT_RESUME_SYSTEM_PROMPT = """
You are a principal resume architect building a Chinese resume workspace.
Return only content that fits the provided response schema.
Write all user-facing text in Simplified Chinese.
Never invent facts, numbers, tools, companies, dates, or outcomes that are not grounded in the input.
Use Action-Task-Result framing inside every achievement bullet:
1. Action: what the candidate concretely did.
2. Task/Scope: what problem, module, flow, or business context it served.
3. Result: what changed, shipped, improved, or was measured.
Quantify the result only when the input supports a metric or count.
If evidence is incomplete, ask at most 3 compressed follow-up questions and still fill the rest of the schema with supported facts.
If additional_answers already contains useful follow-up evidence, do not ask more questions.

Few-shot comparisons:
Bad: Responsible for backend development and optimization.
Good: 负责用户中心接口重构与缓存链路梳理，支撑高并发查询场景并将核心接口平均响应时间降低 32%。

Bad: Participated in testing and team collaboration.
Good: 搭建版本回归清单并联动前后端排查 18 个缺陷，使提测回退次数从 4 次降到 1 次。
""".strip()


STRICT_QUESTION_SYSTEM_PROMPT = """
You identify the highest-value missing evidence in a Chinese resume workflow.
Return only fields that fit the provided response schema.
Write all user-facing text in Simplified Chinese.
Ask at most 3 compressed questions total.
Each question should merge related gaps, instead of splitting one topic into multiple tiny questions.
Prioritize in this order:
1. missing target-role evidence or core skills,
2. the single most relevant experience or project,
3. metrics and outcomes.
If additional_answers already contains usable answers, return an empty questions array.
""".strip()


STRICT_REVISION_SYSTEM_PROMPT = """
You revise a Chinese resume using a validated response schema.
Return only schema fields.
Write all user-facing text in Simplified Chinese.
Preserve grounded facts from the current draft and profile payload.
Apply the user's instruction by rewriting the strongest evidence in sharper Action-Task-Result language.
Do not invent facts or metrics.
""".strip()


STRICT_EXISTING_RESUME_SYSTEM_PROMPT = """
You optimize an uploaded Chinese resume for a target company and role using a validated response schema.
Return only schema fields.
Write all user-facing text in Simplified Chinese.
Keep all output grounded in the uploaded resume, job context, and additional answers.
Use Action-Task-Result phrasing for achievements and quantify outcomes when evidence exists.
If evidence is still incomplete, ask at most 3 compressed questions.
If additional_answers already contains useful evidence, do not ask more questions.
""".strip()


def build_resume_messages(profile_payload: Dict) -> list[Dict[str, str]]:
    """Build chat-completions messages for new resume generation."""

    return [
        {"role": "system", "content": STRICT_RESUME_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": "generate_resume_contract",
                    "instructions": {
                        "selected_modules": profile_payload.get("modules", []),
                        "membership_level": profile_payload.get("membership_level", "basic"),
                        "respect_full_information": profile_payload.get("use_full_information", False),
                        "target_output": "structured_resume",
                    },
                    "profile_payload": profile_payload,
                },
                ensure_ascii=False,
                indent=2,
            ),
        },
    ]


def build_question_messages(profile_payload: Dict) -> list[Dict[str, str]]:
    """Build chat-completions messages for compressed follow-up questions."""

    return [
        {"role": "system", "content": STRICT_QUESTION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": "generate_clarification_questions",
                    "profile_payload": profile_payload,
                },
                ensure_ascii=False,
                indent=2,
            ),
        },
    ]


def build_revision_messages(profile_payload: Dict, resume_text: str, instruction: str) -> list[Dict[str, str]]:
    """Build chat-completions messages for revising an existing draft."""

    return [
        {"role": "system", "content": STRICT_REVISION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": "revise_resume_contract",
                    "revision_instruction": instruction,
                    "current_resume_text": resume_text,
                    "profile_payload": profile_payload,
                },
                ensure_ascii=False,
                indent=2,
            ),
        },
    ]


def build_existing_resume_messages(
    resume_text: str,
    target_company: str,
    target_role: str,
    job_requirements: str,
    instruction: str,
    additional_answers: list[Dict],
    persistent_profile_memory: Dict | None = None,
) -> list[Dict[str, str]]:
    """Build chat-completions messages for optimizing an uploaded resume."""

    return [
        {"role": "system", "content": STRICT_EXISTING_RESUME_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps(
                {
                    "task": "optimize_existing_resume_contract",
                    "resume_text": resume_text,
                    "target_company": target_company,
                    "target_role": target_role,
                    "job_requirements": job_requirements,
                    "instruction": instruction,
                    "additional_answers": additional_answers,
                    "persistent_profile_memory": persistent_profile_memory or {},
                },
                ensure_ascii=False,
                indent=2,
            ),
        },
    ]
