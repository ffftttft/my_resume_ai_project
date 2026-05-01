"""Pydantic request and response models used by the FastAPI backend."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator


JOB_INFO_FIELD_LABELS = {
    "target_company": "目标公司",
    "target_role": "目标岗位",
    "job_requirements": "岗位要求",
    "resume_text": "简历正文",
    "job_description": "职位描述",
    "query": "检索查询",
}

MONTH_PATTERN = re.compile(r"^(?P<year>\d{4})\s*[-./年]?\s*(?P<month>\d{1,2})\s*(?:月)?$")
DATE_PATTERN = re.compile(
    r"^(?P<year>\d{4})\s*[-./年]?\s*(?P<month>\d{1,2})\s*[-./月]?\s*(?P<day>\d{1,2})\s*(?:日)?$"
)
OPEN_ENDED_MONTHS = {"至今", "present", "current", "ongoing", "now"}


def _validate_required_text(value: str, field_name: str) -> str:
    """Ensure required text fields are present."""

    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{JOB_INFO_FIELD_LABELS[field_name]}不能为空。")
    return trimmed


def _normalize_month_text(
    value: str,
    field_name: str,
    *,
    allow_open_ended: bool = False,
    allow_future: bool = False,
) -> str:
    """Normalize YYYY-MM input and validate month-level boundaries."""

    normalized = (value or "").strip()
    if not normalized:
        return ""

    lowered = normalized.lower()
    if allow_open_ended and lowered in OPEN_ENDED_MONTHS:
        return "至今"

    match = MONTH_PATTERN.fullmatch(normalized)
    if not match:
        raise ValueError(f"{field_name}必须为 YYYY-MM 格式。")

    year = int(match.group("year"))
    month = int(match.group("month"))
    if month < 1 or month > 12:
        raise ValueError(f"{field_name}月份不合法。")

    normalized_value = f"{year:04d}-{month:02d}"
    current_month = date.today().replace(day=1)
    value_month = date(year, month, 1)
    if not allow_future and value_month > current_month:
        raise ValueError(f"{field_name}不能晚于当前月份。")

    return normalized_value


def _normalize_birth_date(value: str) -> str:
    """Normalize YYYY-MM-DD input and validate age boundaries."""

    normalized = (value or "").strip()
    if not normalized:
        return ""

    match = DATE_PATTERN.fullmatch(normalized)
    if not match:
        raise ValueError("出生日期必须为 YYYY-MM-DD 格式。")

    try:
        birth = date(
            int(match.group("year")),
            int(match.group("month")),
            int(match.group("day")),
        )
    except ValueError as exc:
        raise ValueError("出生日期不合法。") from exc

    today = date.today()
    if birth > today:
        raise ValueError("出生日期不能晚于今天。")

    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    if age < 14 or age > 80:
        raise ValueError("年龄必须在 14 到 80 岁之间。")

    return birth.isoformat()


def _month_to_date(month_text: str) -> date | None:
    """Convert canonical YYYY-MM to a comparable date."""

    if not month_text or month_text == "至今":
        return None
    return datetime.strptime(month_text, "%Y-%m").date().replace(day=1)


class StrictApiModel(BaseModel):
    """Base API model that rejects unknown fields."""

    model_config = ConfigDict(extra="forbid")


class BasicInfo(StrictApiModel):
    """Basic profile fields displayed at the top of the resume."""

    name: str = Field(default="", examples=["张三"])
    birth_date: str = Field(default="", examples=["2002-06-18"])
    gender: str = Field(default="", examples=["男"])
    political_status: str = Field(default="", examples=["中共党员"])
    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    job_requirements: str = Field(default="", examples=["熟悉 Python、MySQL、接口设计与工程化流程"])
    email: str = Field(default="", examples=["zhangsan@example.com"])
    phone: str = Field(default="", examples=["13800000000"])
    city: str = Field(default="", examples=["上海"])
    summary: str = Field(default="", examples=["关注后端接口设计、性能优化和工程化交付。"])

    @field_validator("target_company", "target_role", "job_requirements")
    @classmethod
    def validate_required_job_fields(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: str) -> str:
        return _normalize_birth_date(value)


class EducationItem(StrictApiModel):
    """Education record example used in the form and AI prompt."""

    school: str = Field(default="", examples=["XX 大学"])
    degree: str = Field(default="", examples=["本科"])
    major: str = Field(default="", examples=["软件工程"])
    start_date: str = Field(default="", examples=["2022-09"])
    end_date: str = Field(default="", examples=["2026-06"])
    gpa: str = Field(default="", examples=["3.7/4.0"])
    ranking: str = Field(default="", examples=["前 15%"])
    courses: List[str] = Field(default_factory=list, examples=[["数据结构", "数据库系统"]])
    highlights: List[str] = Field(default_factory=list, examples=[["GPA 3.7/4.0", "主修数据库系统"]])

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _normalize_month_text(value, "教育开始时间")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _normalize_month_text(value, "教育结束时间", allow_open_ended=True, allow_future=True)

    @model_validator(mode="after")
    def validate_period_order(self) -> "EducationItem":
        start = _month_to_date(self.start_date)
        end = _month_to_date(self.end_date)
        if start and end and start > end:
            raise ValueError("教育开始时间不能晚于结束时间。")
        return self


class ExperienceItem(StrictApiModel):
    """Internship or work experience record."""

    company: str = Field(default="", examples=["示例科技"])
    role: str = Field(default="", examples=["后端开发实习生"])
    department: str = Field(default="", examples=["数据平台部"])
    location: str = Field(default="", examples=["上海"])
    start_date: str = Field(default="", examples=["2025-07"])
    end_date: str = Field(default="", examples=["2025-10"])
    summary: str = Field(default="", examples=["负责数据平台接口开发与联调。"])
    tools: List[str] = Field(default_factory=list, examples=[["Python", "MySQL"]])
    highlights: List[str] = Field(default_factory=list, examples=[["负责接口开发与联调", "优化 SQL 查询延迟 30%"]])
    attachment_name: str = Field(default="", examples=["intern_report.pdf"])
    attachment_context: str = Field(default="", examples=["附件中包含接口优化记录。"])

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _normalize_month_text(value, "经历开始时间")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _normalize_month_text(value, "经历结束时间", allow_open_ended=True)

    @model_validator(mode="after")
    def validate_period_order(self) -> "ExperienceItem":
        start = _month_to_date(self.start_date)
        end = _month_to_date(self.end_date)
        if start and end and start > end:
            raise ValueError("经历开始时间不能晚于结束时间。")
        return self


class ProjectItem(StrictApiModel):
    """Project experience record shown in the resume body."""

    name: str = Field(default="", examples=["校园活动管理平台"])
    role: str = Field(default="", examples=["全栈开发"])
    start_date: str = Field(default="", examples=["2025-02"])
    end_date: str = Field(default="", examples=["2025-05"])
    description: str = Field(default="", examples=["面向校内社团的活动申请与报名平台。"])
    tools: List[str] = Field(default_factory=list, examples=[["FastAPI", "React", "MySQL"]])
    project_url: str = Field(default="", examples=["https://github.com/example/project"])
    highlights: List[str] = Field(default_factory=list, examples=[["使用 FastAPI + React 开发", "接口响应时间降低 30%"]])
    attachment_name: str = Field(default="", examples=["project_slides.pdf"])
    attachment_context: str = Field(default="", examples=["附件中包含项目背景和关键流程图。"])

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: str) -> str:
        return _normalize_month_text(value, "项目开始时间")

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: str) -> str:
        return _normalize_month_text(value, "项目结束时间", allow_open_ended=True)

    @model_validator(mode="after")
    def validate_period_order(self) -> "ProjectItem":
        start = _month_to_date(self.start_date)
        end = _month_to_date(self.end_date)
        if start and end and start > end:
            raise ValueError("项目开始时间不能晚于结束时间。")
        return self


class AwardItem(StrictApiModel):
    """Award, scholarship, competition, certificate, or honor record."""

    award_name: str = Field(default="", examples=["校级奖学金"])
    date: str = Field(default="", examples=["2025-06"])
    level: str = Field(default="", examples=["校级"])
    issuer: str = Field(default="", examples=["示例大学"])
    description: str = Field(default="", examples=["成绩排名靠前，或在竞赛中完成核心分析工作。"])

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        return _normalize_month_text(value, "获奖时间")


class ClarificationAnswer(StrictApiModel):
    """Answer to an AI-generated clarification question."""

    question: str = Field(default="", examples=["项目里你具体负责哪一部分？"])
    answer: str = Field(default="", examples=["我主要负责后端接口设计、数据库建模和联调。"])


class UserProfile(StrictApiModel):
    """Main profile payload sent from the frontend to the backend."""

    basic_info: BasicInfo = Field(default_factory=BasicInfo)
    skills: List[str] = Field(default_factory=list, examples=[["Python", "FastAPI", "MySQL"]])
    education: List[EducationItem] = Field(default_factory=list)
    experiences: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    awards: List[AwardItem] = Field(default_factory=list)
    modules: List[str] = Field(
        default_factory=lambda: ["summary", "skills", "education", "projects", "experience", "awards"]
    )
    membership_level: Literal["basic", "advanced"] = "basic"
    use_full_information: bool = False
    uploaded_context: str = ""
    additional_answers: List[ClarificationAnswer] = Field(default_factory=list)


class GenerateResumeRequest(StrictApiModel):
    """Example request for /api/resume/generate."""

    profile: UserProfile
    template_id: str = Field(default="", examples=["state-owned-general"])

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "profile": {
                    "basic_info": {
                        "name": "张三",
                        "birth_date": "2002-06-18",
                        "target_company": "字节跳动",
                        "target_role": "后端开发工程师",
                        "job_requirements": "熟悉 Python、MySQL、接口设计与工程化流程",
                        "email": "zhangsan@example.com",
                        "phone": "13800000000",
                        "city": "上海",
                        "summary": "",
                    },
                    "skills": ["Python", "FastAPI", "MySQL"],
                    "education": [],
                    "experiences": [],
                    "projects": [],
                    "awards": [],
                    "modules": ["summary", "skills", "projects", "experience", "awards"],
                    "membership_level": "basic",
                    "use_full_information": False,
                    "uploaded_context": "",
                    "additional_answers": [],
                }
            }
        },
    )


class ClarificationRequest(StrictApiModel):
    """Example request for /api/resume/questions."""

    profile: UserProfile


class ReviseResumeRequest(StrictApiModel):
    """Example request for /api/resume/revise."""

    profile: UserProfile
    resume_text: str = Field(default="", examples=["# 张三\n\n## 项目经历\n- ..."])
    instruction: str = Field(default="", examples=["把项目经历改成更偏工程化的表达。"])


class ExportResumeRequest(StrictApiModel):
    """Example request for /api/resume/export."""

    resume_text: str = Field(default="", examples=["# 张三\n\n## 技能\n- Python"])
    file_name: str = Field(default="resume", examples=["zhangsan_resume"])
    format: Literal["md", "txt"] = "md"


class SaveWorkspaceRequest(StrictApiModel):
    """Workspace draft payload used for manual save and autosave."""

    form_state: Dict = Field(default_factory=dict)
    source: Literal["manual", "autosave"] = "manual"
    active_board: str = "greenfield"
    greenfield_workspace: Dict[str, Any] = Field(default_factory=dict)
    existing_form_state: Dict[str, Any] = Field(default_factory=dict)
    existing_resume_workspace: Dict[str, Any] = Field(default_factory=dict)
    resume_image_state: Dict[str, Any] = Field(default_factory=dict)
    selected_resume_template_id: str = ""
    resume_image_model: str = ""


class DeleteSnapshotRequest(StrictApiModel):
    """Delete a saved resume snapshot by timestamp."""

    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class UploadedFilePreviewRequest(StrictApiModel):
    """Preview one uploaded file by saved file name."""

    saved_name: str = Field(default="", examples=["24ae1d7edc7e412baac6d43f8ac78ada.pdf"])


class DeleteUploadedFileRequest(StrictApiModel):
    """Delete one uploaded-file record, and optionally the saved file."""

    saved_name: str = Field(default="", examples=["24ae1d7edc7e412baac6d43f8ac78ada.pdf"])
    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class DeleteDownloadedArtifactRequest(StrictApiModel):
    """Delete one exported artifact record."""

    file_name: str = Field(default="", examples=["resume.md"])
    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class ExistingResumeOptimizeRequest(StrictApiModel):
    """Optimize an uploaded resume for a target job and return follow-up questions."""

    resume_text: str = Field(default="", examples=["张三\n后端开发工程师\n..."])
    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    job_requirements: str = Field(default="", examples=["熟悉 Python、MySQL、接口设计和性能优化"])
    instruction: str = Field(default="", examples=["更突出后端工程化和性能优化成果"])
    additional_answers: List[ClarificationAnswer] = Field(default_factory=list)
    template_id: str = Field(default="", examples=["state-owned-general"])

    @field_validator("target_company", "target_role", "job_requirements")
    @classmethod
    def validate_required_job_fields(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class SemanticATSScoreRequest(StrictApiModel):
    """Score resume-to-JD fit using semantic ATS logic."""

    resume_text: str = Field(default="", examples=["张三\n后端开发工程师\n..."])
    job_description: str = Field(default="", examples=["熟悉 Python、API 设计、数据库优化与工程化交付"])

    @field_validator("resume_text", "job_description")
    @classmethod
    def validate_required_text_fields(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class RagSearchRequest(StrictApiModel):
    """Legacy local reference-search request kept for compatibility."""

    query: str = Field(default="", examples=["高级数据工程师 Spark Airflow"])
    top_k: int = Field(default=3, ge=1, le=8)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class JobContextSearchRequest(StrictApiModel):
    """Network job-intelligence lookup request."""

    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    job_requirements: str = Field(default="", examples=["熟悉 Python、MySQL、接口设计和性能优化"])
    force_refresh: bool = False


class SaveResumeSnapshotRequest(StrictApiModel):
    """Save the current resume editor content as a snapshot."""

    title: str = Field(default="", examples=["字节跳动 - 后端工程师简历草稿"])
    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    resume_text: str = Field(default="", examples=["张三\n后端开发工程师\n..."])
    generation_mode: str = Field(default="manual_preserve", examples=["manual_preserve"])
    analysis_notes: List[str] = Field(default_factory=list, examples=[["优先补强量化结果。"]])
    board: str = Field(default="", examples=["greenfield"])
    workspace: Dict[str, Any] = Field(default_factory=dict)
    form_state: Dict[str, Any] = Field(default_factory=dict)
    image_generation: Dict[str, Any] = Field(default_factory=dict)
    resume_image_page_open: bool = False


class ResumeImageGenerateRequest(StrictApiModel):
    """Generate an A4 resume image from resume text, template, and optional avatar."""

    resume_text: str = Field(default="", examples=["# 张三\n\n## 项目经历\n- ..."])
    template_id: str = Field(default="state-owned-general", examples=["state-owned-general"])
    avatar_saved_name: str = Field(default="", examples=["avatar.png"])
    model: Literal["gpt-image-2", "gpt-image-2pro"] = "gpt-image-2"
    board: str = Field(default="", examples=["greenfield"])

    @field_validator("resume_text")
    @classmethod
    def validate_resume_text(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class ResumeFileGenerateRequest(StrictApiModel):
    """Generate a DOCX-template-based resume file and image preview."""

    resume_text: str = Field(default="", examples=["# 张三\n\n## 项目经历\n- ..."])
    template_id: str = Field(default="state-owned-general", examples=["state-owned-general"])
    avatar_saved_name: str = Field(default="", examples=["avatar.png"])
    board: str = Field(default="", examples=["greenfield"])
    file_name: str = Field(default="", examples=["zhangsan-resume"])
    structured_resume: Dict[str, Any] = Field(default_factory=dict)
    form_state: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("resume_text")
    @classmethod
    def validate_resume_text(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class ResumeImageOcrWordRequest(StrictApiModel):
    """Export editable Word text by OCR-ing a generated resume image."""

    image_saved_name: str = Field(default="", examples=["generated-resume.png"])
    file_name: str = Field(default="resume-image-ocr", examples=["zhangsan_resume_ocr"])

    @field_validator("image_saved_name")
    @classmethod
    def validate_image_saved_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("image_saved_name cannot be empty.")
        return trimmed


class ApiEnvelope(StrictApiModel):
    """Common shape for API responses."""

    ok: bool = True
    message: str = "success"
    data: Dict = Field(default_factory=dict)
