"""Prompt builders used by the resume AI engine."""

from __future__ import annotations

import json
from typing import Dict


STRICT_FEW_SHOT_BLOCK = """
Few-shot comparisons:
Bad: Responsible for backend development and optimization.
Good: 负责用户中心接口重构与缓存链路梳理，支撑高并发查询场景，并将核心接口平均响应时间降低 32%。
Bad: Participated in testing and team collaboration.
Good: 搭建版本回归清单并联动前后端排查 18 个缺陷，使提测回退次数从 4 次降到 1 次。
Bad: Worked on a recommendation project.
Good: 参与推荐策略服务改造，负责召回特征清洗与离线评估脚本编写，帮助模型迭代周期从 5 天压缩到 3 天。
Bad: Led a campus project.
Good: 作为校园活动平台项目负责人，拆分报名、审核与通知流程，推动 3 人小组在 2 周内完成上线，并服务 1200+ 名校内用户。
Bad: Optimized an existing resume for a data engineer role.
Good: 围绕数据工程岗位要求补强 Spark、Airflow 与数据建模证据，将经历改写为“动作-场景-结果”结构，并保留原始事实边界。
""".strip()


STRICT_RESUME_SYSTEM_PROMPT = f"""
You are a principal resume architect building a Chinese resume workspace.
Return only content that fits the provided response schema.
Write all user-facing text in Simplified Chinese.
Never invent facts, numbers, tools, companies, dates, or outcomes that are not grounded in the input.
If web_context is provided, use it only as terminology and structure guidance. Never copy facts, metrics, names, or claims from web search results.
Use Action-Task-Result framing inside every achievement bullet:
1. Action: what the candidate concretely did.
2. Task/Scope: what problem, module, flow, or business context it served.
3. Result: what changed, shipped, improved, or was measured.
Quantify the result only when the input supports a metric or count.
If evidence is incomplete, ask at most 3 compressed follow-up questions and still fill the rest of the schema with supported facts.
If additional_answers already contains useful follow-up evidence, do not ask more questions.
{STRICT_FEW_SHOT_BLOCK}
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


STRICT_REVISION_SYSTEM_PROMPT = f"""
You revise a Chinese resume using a validated response schema.
Return only schema fields.
Write all user-facing text in Simplified Chinese.
Preserve grounded facts from the current draft and profile payload.
If web_context is provided, use it only to strengthen terminology, not to borrow facts or outcomes.
Apply the user's instruction by rewriting the strongest evidence in sharper Action-Task-Result language.
Do not invent facts, dates, companies, tools, or metrics.
{STRICT_FEW_SHOT_BLOCK}
""".strip()


STRICT_EXISTING_RESUME_SYSTEM_PROMPT = f"""
You optimize an uploaded Chinese resume for a target company and role using a validated response schema.
Return only schema fields.
Write all user-facing text in Simplified Chinese.
Keep all output grounded in the uploaded resume, job context, and additional answers.
If web_context is provided, use it only as language and terminology guidance. Do not copy searched facts into the candidate resume.
Use Action-Task-Result phrasing for achievements and quantify outcomes when evidence exists.
If evidence is still incomplete, ask at most 3 compressed questions.
If additional_answers already contains useful evidence, do not ask more questions.
{STRICT_FEW_SHOT_BLOCK}
""".strip()


# Compatibility aliases: the runtime uses the strict schema-first prompts.
RESUME_SYSTEM_PROMPT = STRICT_RESUME_SYSTEM_PROMPT
QUESTION_SYSTEM_PROMPT = STRICT_QUESTION_SYSTEM_PROMPT
REVISION_SYSTEM_PROMPT = STRICT_REVISION_SYSTEM_PROMPT
EXISTING_RESUME_SYSTEM_PROMPT = STRICT_EXISTING_RESUME_SYSTEM_PROMPT


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
                "Return valid JSON only.",
                "Respect the selected modules and membership level.",
                "Ask at most 3 questions total.",
                "Use Action-Task-Result wording for achievements.",
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
                "Use Action-Task-Result wording when rewriting achievements.",
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
    web_context: list[Dict] | None = None,
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
                "Use Action-Task-Result wording for achievements.",
                "If additional_answers is not empty, do not ask more questions.",
            ],
            "resume_text": resume_text,
            "target_company": target_company,
            "target_role": target_role,
            "job_requirements": job_requirements,
            "revision_instruction": instruction,
            "additional_answers": additional_answers,
            "persistent_profile_memory": persistent_profile_memory or {},
            "web_context": web_context or [],
        },
        ensure_ascii=False,
        indent=2,
    )


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
    web_context: list[Dict] | None = None,
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
                    "web_context": web_context or [],
                },
                ensure_ascii=False,
                indent=2,
            ),
        },
    ]
