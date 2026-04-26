"""Strict resume output contracts used by Instructor and the frontend workspace."""

from __future__ import annotations

import re
from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


DATE_PATTERN = re.compile(r"^(?P<year>\d{4})-(?P<month>\d{2})$")
MONTH_PATTERN = re.compile(r"^(?P<year>\d{4})\s*(?:[-./年])\s*(?P<month>\d{1,2})\s*月?$")
MONTH_TOKEN_PATTERN = re.compile(r"(?P<year>\d{4})\s*(?:[-./年])\s*(?P<month>\d{1,2})\s*月?")
OPEN_ENDED_PATTERN = re.compile(r"^(?:present|current|now|ongoing|至今|现在|目前)$", re.IGNORECASE)
RANGE_MARKER_PATTERN = re.compile(r"(?:到|至|~|～|-|—|–|－)")
OPEN_ENDED_DATES = {
    "",
    "Present",
    "Current",
    "Now",
    "Ongoing",
    "至今",
    "现在",
    "目前",
}


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


def _invalid_month_error(field_name: str) -> ValueError:
    """Return a consistent date validation error."""

    return ValueError(f"{field_name} must be YYYY-MM or an allowed open-ended value.")


def _normalize_month_token(year: str, month: str, field_name: str) -> str:
    """Convert a year-month token into canonical YYYY-MM form."""

    month_number = int(month)
    if month_number < 1 or month_number > 12:
        raise _invalid_month_error(field_name)
    return f"{year}-{month_number:02d}"


def _normalize_open_ended(value: str) -> str:
    """Map open-ended date labels to one stable value."""

    normalized = re.sub(r"\s+", "", (value or "").strip())
    if not normalized:
        return ""
    if OPEN_ENDED_PATTERN.fullmatch(normalized):
        return "Present"
    return ""


def _extract_period_bounds(value: str) -> tuple[str, str] | None:
    """Parse a combined period string such as 2025年12月-2026年03月."""

    cleaned = (value or "").strip()
    if not cleaned:
        return None

    month_tokens = [
        _normalize_month_token(match.group("year"), match.group("month"), "date")
        for match in MONTH_TOKEN_PATTERN.finditer(cleaned)
    ]
    if len(month_tokens) >= 2:
        return month_tokens[0], month_tokens[1]

    remaining = re.sub(r"\s+", "", MONTH_TOKEN_PATTERN.sub("", cleaned))
    if len(month_tokens) == 1 and (
        any(token in remaining for token in ["至今", "现在", "目前"])
        or any(token in remaining.lower() for token in ["present", "current", "now", "ongoing"])
    ):
        return month_tokens[0], "Present"

    remaining_open_ended = _normalize_open_ended(RANGE_MARKER_PATTERN.sub("", remaining))
    if len(month_tokens) == 1 and remaining_open_ended:
        return month_tokens[0], remaining_open_ended

    open_ended = _normalize_open_ended(cleaned)
    if len(month_tokens) == 1 and open_ended:
        return month_tokens[0], open_ended

    if len(month_tokens) == 1 and remaining and RANGE_MARKER_PATTERN.search(remaining):
        return month_tokens[0], open_ended

    return None


def _normalize_period_payload(value: Any) -> Any:
    """Split combined date ranges before field-level validation runs."""

    if not isinstance(value, dict):
        return value

    normalized: Dict[str, Any] = dict(value)
    start_raw = normalized.get("start_date", "")
    end_raw = normalized.get("end_date", "")

    parsed_start = _extract_period_bounds(start_raw)
    parsed_end = _extract_period_bounds(end_raw) if not parsed_start else None

    if parsed_start:
        normalized["start_date"], normalized["end_date"] = parsed_start
    elif parsed_end:
        normalized["start_date"], normalized["end_date"] = parsed_end

    return normalized


def _validate_month(value: str, field_name: str, allow_open_ended: bool = False) -> str:
    """Accept YYYY-MM and optionally open-ended values."""

    normalized = (value or "").strip()
    if not normalized:
        return ""

    open_ended = _normalize_open_ended(normalized)
    if allow_open_ended and open_ended:
        return open_ended

    exact_match = DATE_PATTERN.fullmatch(normalized)
    if exact_match:
        return _normalize_month_token(exact_match.group("year"), exact_match.group("month"), field_name)

    month_match = MONTH_PATTERN.fullmatch(normalized)
    if month_match:
        return _normalize_month_token(month_match.group("year"), month_match.group("month"), field_name)

    if allow_open_ended and normalized in OPEN_ENDED_DATES:
        return "Present" if normalized else ""

    raise _invalid_month_error(field_name)


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

    @model_validator(mode="before")
    @classmethod
    def normalize_period_fields(cls, value: Any) -> Any:
        return _normalize_period_payload(value)

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

    @model_validator(mode="before")
    @classmethod
    def normalize_period_fields(cls, value: Any) -> Any:
        return _normalize_period_payload(value)

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

    @model_validator(mode="before")
    @classmethod
    def normalize_period_fields(cls, value: Any) -> Any:
        return _normalize_period_payload(value)

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
