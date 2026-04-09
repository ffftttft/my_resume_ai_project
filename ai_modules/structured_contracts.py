"""Strict resume output contracts used by Instructor and the frontend workspace."""

from __future__ import annotations

import re
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator


DATE_PATTERN = re.compile(r"^\d{4}-\d{2}$")
OPEN_ENDED_DATES = {"", "Present", "present", "至今"}


class StrictModel(BaseModel):
    """Base model that rejects extra keys from model output."""

    model_config = ConfigDict(extra="forbid")


def _clean_text_list(values: List[str], limit: int) -> List[str]:
    """Normalize repeated text arrays emitted by the model."""

    cleaned: List[str] = []
    for value in values or []:
        normalized = (value or "").strip()
        if not normalized or normalized in cleaned:
            continue
        cleaned.append(normalized)
        if len(cleaned) >= limit:
            break
    return cleaned


def _validate_month(value: str, field_name: str, allow_open_ended: bool = False) -> str:
    """Accept YYYY-MM and optionally open-ended values."""

    normalized = (value or "").strip()
    if not normalized:
        return ""
    if allow_open_ended and normalized in OPEN_ENDED_DATES:
        return normalized
    if DATE_PATTERN.fullmatch(normalized):
        return normalized
    raise ValueError(f"{field_name} must be YYYY-MM or an allowed open-ended value.")


class ResumeContact(StrictModel):
    """Structured top-of-resume contact block."""

    full_name: str = Field(default="", description="Candidate full name exactly as supported by the input.")
    email: str = Field(default="", description="Primary email address. Leave blank if the input does not provide one.")
    phone: str = Field(default="", description="Primary phone number. Leave blank if unavailable.")
    city: str = Field(default="", description="Current city or preferred city from the input.")
    target_company: str = Field(
        default="",
        description="Target company from the job context. Keep blank when the resume is generic.",
    )
    target_role: str = Field(default="", description="Target role that the resume should align to.")


class ResumeSkillCategory(StrictModel):
    """One skill bucket such as backend, data, or tools."""

    category: str = Field(
        ...,
        description="Skill category label such as Frontend, Backend, Data, AI, Tools, Languages, or Other.",
    )
    items: List[str] = Field(
        default_factory=list,
        description="Two to six concise skills in this category. Do not repeat the same skill in multiple categories.",
    )

    @field_validator("items")
    @classmethod
    def normalize_items(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=8)


class ResumeEducationRecord(StrictModel):
    """Education row rendered in the resume body."""

    school_name: str = Field(..., description="School or university name.")
    degree: str = Field(default="", description="Degree label such as Bachelor, Master, or Diploma.")
    major: str = Field(default="", description="Major or concentration.")
    start_date: str = Field(default="", description="Education start month in YYYY-MM when known.")
    end_date: str = Field(
        default="",
        description="Education end month in YYYY-MM, or 至今 / Present when still studying.",
    )
    highlights: List[str] = Field(
        default_factory=list,
        description="One to three short highlights such as GPA, honors, coursework, ranking, or competitions.",
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _validate_month(value, "start_date")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _validate_month(value, "end_date", allow_open_ended=True)

    @field_validator("highlights")
    @classmethod
    def normalize_highlights(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=4)


class ResumeExperienceRecord(StrictModel):
    """Work or internship item written in Action-Task-Result style."""

    company_name: str = Field(..., description="Company or organization name.")
    job_title: str = Field(..., description="Role title for this experience.")
    start_date: str = Field(default="", description="Start month in YYYY-MM when known.")
    end_date: str = Field(
        default="",
        description="End month in YYYY-MM, or 至今 / Present if still active.",
    )
    role_scope: str = Field(
        default="",
        description="One concise line describing the business context, team scope, or responsibility boundary.",
    )
    achievements: List[str] = Field(
        default_factory=list,
        description=(
            "Two to five resume bullets. Each bullet must follow Action-Task-Result framing and quantify impact when"
            " the input supports a metric."
        ),
    )
    tools: List[str] = Field(
        default_factory=list,
        description="Optional tools, systems, languages, or platforms directly used in this experience.",
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _validate_month(value, "start_date")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _validate_month(value, "end_date", allow_open_ended=True)

    @field_validator("achievements")
    @classmethod
    def normalize_achievements(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=5)

    @field_validator("tools")
    @classmethod
    def normalize_tools(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=8)


class ResumeProjectRecord(StrictModel):
    """Project item kept separate from formal work history."""

    project_name: str = Field(..., description="Project or product name.")
    role: str = Field(default="", description="Role played in the project.")
    start_date: str = Field(default="", description="Project start month in YYYY-MM when known.")
    end_date: str = Field(
        default="",
        description="Project end month in YYYY-MM, or 至今 / Present if still active.",
    )
    project_summary: str = Field(
        default="",
        description="One concise sentence describing the project goal, users, or system scope.",
    )
    achievements: List[str] = Field(
        default_factory=list,
        description="Two to four Action-Task-Result bullets for the project's strongest evidence.",
    )
    tools: List[str] = Field(
        default_factory=list,
        description="Primary stack, tools, or platforms directly used in the project.",
    )

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _validate_month(value, "start_date")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _validate_month(value, "end_date", allow_open_ended=True)

    @field_validator("achievements")
    @classmethod
    def normalize_achievements(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=4)

    @field_validator("tools")
    @classmethod
    def normalize_tools(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=8)


class StructuredResume(StrictModel):
    """Full validated resume contract returned by the model."""

    contact: ResumeContact = Field(
        default_factory=ResumeContact,
        description="Contact and target-role block shown at the top of the resume.",
    )
    summary: str = Field(
        default="",
        description="A concise professional summary in Simplified Chinese, focused on target-role fit and real evidence.",
    )
    experience: List[ResumeExperienceRecord] = Field(
        default_factory=list,
        description="Ordered work or internship records, strongest and most relevant first.",
    )
    education: List[ResumeEducationRecord] = Field(
        default_factory=list,
        description="Ordered education records.",
    )
    skills: List[ResumeSkillCategory] = Field(
        default_factory=list,
        description="Skill categories such as Backend, Frontend, Data, AI, Tools, or Languages.",
    )
    projects: List[ResumeProjectRecord] = Field(
        default_factory=list,
        description="Optional project records when the candidate has meaningful project evidence.",
    )


class ResumeQuestionResult(StrictModel):
    """Strict schema for compressed follow-up questions."""

    questions: List[str] = Field(
        default_factory=list,
        description="Zero to three compressed questions that combine related missing evidence.",
    )
    detected_gaps: List[str] = Field(
        default_factory=list,
        description="Short machine-readable gap tags such as missing_metrics or missing_core_skill.",
    )

    @field_validator("questions")
    @classmethod
    def normalize_questions(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=3)

    @field_validator("detected_gaps")
    @classmethod
    def normalize_gaps(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=6)


class ResumeGenerationResult(StrictModel):
    """Strict schema for new-resume generation and existing-resume optimization."""

    title: str = Field(default="", description="Short workspace title for the generated resume result.")
    structured_resume: StructuredResume = Field(
        default_factory=StructuredResume,
        description="The validated resume contract that the UI and exporters should rely on.",
    )
    questions: List[str] = Field(
        default_factory=list,
        description="Zero to three compressed follow-up questions. Leave empty when evidence is already sufficient.",
    )
    analysis_notes: List[str] = Field(
        default_factory=list,
        description="Two to five brief operator notes describing what was emphasized, trimmed, or still missing.",
    )

    @field_validator("questions")
    @classmethod
    def normalize_questions(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=3)

    @field_validator("analysis_notes")
    @classmethod
    def normalize_analysis_notes(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=5)


class ResumeRevisionResult(StrictModel):
    """Strict schema for revising an existing draft."""

    title: str = Field(default="", description="Short workspace title for the revised resume.")
    structured_resume: StructuredResume = Field(
        default_factory=StructuredResume,
        description="Validated revised resume contract after applying the user's instruction.",
    )
    analysis_notes: List[str] = Field(
        default_factory=list,
        description="Two to five brief revision notes explaining what changed or what constraints were respected.",
    )

    @field_validator("analysis_notes")
    @classmethod
    def normalize_analysis_notes(cls, value: List[str]) -> List[str]:
        return _clean_text_list(value, limit=5)

