"""Pydantic request and response models used by the FastAPI backend."""

from typing import Dict, List, Literal

from pydantic import BaseModel, Field, ValidationInfo, field_validator


JOB_INFO_FIELD_LABELS = {
    "target_company": "Company",
    "target_role": "Job title",
    "job_requirements": "Job requirements",
}


def _validate_required_text(value: str, field_name: str) -> str:
    """Ensure required job-target fields are present in both workflows."""

    trimmed = value.strip()
    if not trimmed:
        raise ValueError(
            f"{JOB_INFO_FIELD_LABELS[field_name]} is required. Provide a specific value or use the generic option."
        )
    return trimmed


class BasicInfo(BaseModel):
    """Basic profile fields displayed at the top of the resume."""

    name: str = Field(default="", examples=["张三"])
    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发实习生"])
    job_requirements: str = Field(default="", examples=["熟悉 Python、后端接口设计和数据库优化"])
    email: str = Field(default="", examples=["zhangsan@example.com"])
    phone: str = Field(default="", examples=["13800000000"])
    city: str = Field(default="", examples=["上海"])
    summary: str = Field(default="", examples=["关注后端接口设计、性能优化和工程化交付。"])

    @field_validator("target_company", "target_role", "job_requirements")
    @classmethod
    def validate_required_job_fields(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class EducationItem(BaseModel):
    """Education record example used in the form and AI prompt."""

    school: str = Field(default="", examples=["XX大学"])
    degree: str = Field(default="", examples=["本科"])
    major: str = Field(default="", examples=["软件工程"])
    start_date: str = Field(default="", examples=["2022-09"])
    end_date: str = Field(default="", examples=["2026-06"])
    highlights: List[str] = Field(default_factory=list, examples=[["GPA 3.7/4.0", "主修数据库系统与软件测试"]])


class ExperienceItem(BaseModel):
    """Internship or work experience record."""

    company: str = Field(default="", examples=["示例科技"])
    role: str = Field(default="", examples=["后端开发实习生"])
    start_date: str = Field(default="", examples=["2025-07"])
    end_date: str = Field(default="", examples=["2025-10"])
    highlights: List[str] = Field(default_factory=list, examples=[["负责接口开发与联调", "优化 SQL 查询延迟 30%"]])
    attachment_name: str = Field(default="", examples=["intern_report.pdf"])
    attachment_context: str = Field(default="", examples=["附件中包含用户中心接口优化记录。"])


class ProjectItem(BaseModel):
    """Project experience record shown in the resume body."""

    name: str = Field(default="", examples=["校园活动管理平台"])
    role: str = Field(default="", examples=["全栈开发"])
    start_date: str = Field(default="", examples=["2025-02"])
    end_date: str = Field(default="", examples=["2025-05"])
    description: str = Field(default="", examples=["面向校内社团的活动申请与报名平台。"])
    highlights: List[str] = Field(default_factory=list, examples=[["使用 FastAPI + React 开发", "活动列表接口响应时间降低 30%"]])
    attachment_name: str = Field(default="", examples=["project_slides.pdf"])
    attachment_context: str = Field(default="", examples=["附件中包含项目背景和关键流程图。"])


class ClarificationAnswer(BaseModel):
    """Answer to an AI-generated clarification question."""

    question: str = Field(default="", examples=["项目里你具体负责哪一部分？"])
    answer: str = Field(default="", examples=["我主要负责后端接口设计、数据库建模和联调。"])


class UserProfile(BaseModel):
    """Main profile payload sent from the frontend to the backend."""

    basic_info: BasicInfo = Field(default_factory=BasicInfo)
    skills: List[str] = Field(default_factory=list, examples=[["Python", "FastAPI", "MySQL"]])
    education: List[EducationItem] = Field(default_factory=list)
    experiences: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    modules: List[str] = Field(
        default_factory=lambda: ["summary", "skills", "education", "projects", "experience"]
    )
    membership_level: Literal["basic", "advanced"] = "basic"
    use_full_information: bool = False
    uploaded_context: str = ""
    additional_answers: List[ClarificationAnswer] = Field(default_factory=list)


class GenerateResumeRequest(BaseModel):
    """Example request for /api/resume/generate."""

    profile: UserProfile

    model_config = {
        "json_schema_extra": {
            "example": {
                "profile": {
                    "basic_info": {"name": "张三", "target_role": "后端开发实习生"},
                    "skills": ["Python", "FastAPI", "MySQL"],
                    "education": [],
                    "experiences": [
                        {
                            "company": "示例科技",
                            "role": "后端开发实习生",
                            "start_date": "2025-07",
                            "end_date": "2025-10",
                            "highlights": ["参与用户中心接口开发"],
                            "attachment_name": "intern_report.pdf",
                            "attachment_context": "附件中包含接口优化说明。",
                        }
                    ],
                    "projects": [],
                    "modules": ["summary", "skills", "projects", "experience"],
                    "membership_level": "basic",
                    "use_full_information": False,
                    "uploaded_context": "",
                    "additional_answers": [],
                }
            }
        }
    }


class ClarificationRequest(BaseModel):
    """Example request for /api/resume/questions."""

    profile: UserProfile


class ReviseResumeRequest(BaseModel):
    """Example request for /api/resume/revise."""

    profile: UserProfile
    resume_text: str = Field(default="", examples=["# 张三\n\n## 项目经历\n- ..."])
    instruction: str = Field(default="", examples=["把项目经历改成更偏工程化的表达。"])


class ExportResumeRequest(BaseModel):
    """Example request for /api/resume/export."""

    resume_text: str = Field(default="", examples=["# 张三\n\n## 技能\n- Python"])
    file_name: str = Field(default="resume", examples=["zhangsan_resume"])
    format: Literal["md", "txt"] = "md"


class SaveWorkspaceRequest(BaseModel):
    """Workspace draft payload used for manual save and autosave."""

    form_state: Dict = Field(default_factory=dict)
    source: Literal["manual", "autosave"] = "manual"


class DeleteSnapshotRequest(BaseModel):
    """Delete a saved resume snapshot by timestamp."""

    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class UploadedFilePreviewRequest(BaseModel):
    """Preview one uploaded file by saved file name."""

    saved_name: str = Field(default="", examples=["24ae1d7edc7e412baac6d43f8ac78ada.pdf"])


class DeleteUploadedFileRequest(BaseModel):
    """Delete one uploaded-file record, and optionally the saved file."""

    saved_name: str = Field(default="", examples=["24ae1d7edc7e412baac6d43f8ac78ada.pdf"])
    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class DeleteDownloadedArtifactRequest(BaseModel):
    """Delete one exported artifact record."""

    file_name: str = Field(default="", examples=["resume.md"])
    timestamp: str = Field(default="", examples=["2026-04-07T23:00:00+08:00"])


class ExistingResumeOptimizeRequest(BaseModel):
    """Optimize an uploaded resume for a target job and return follow-up questions."""

    resume_text: str = Field(default="", examples=["张三\n后端开发工程师\n..."])
    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    job_requirements: str = Field(default="", examples=["熟悉 Python、MySQL、接口设计和性能优化"])
    instruction: str = Field(default="", examples=["更突出后端工程化和性能优化成果"])
    additional_answers: List[ClarificationAnswer] = Field(default_factory=list)

    @field_validator("target_company", "target_role", "job_requirements")
    @classmethod
    def validate_required_job_fields(cls, value: str, info: ValidationInfo) -> str:
        return _validate_required_text(value, info.field_name)


class SaveResumeSnapshotRequest(BaseModel):
    """Save the current resume editor content as a snapshot."""

    target_company: str = Field(default="", examples=["字节跳动"])
    target_role: str = Field(default="", examples=["后端开发工程师"])
    resume_text: str = Field(default="", examples=["张三\n后端开发工程师\n..."])
    generation_mode: str = Field(default="manual_preserve", examples=["manual_preserve"])


class ApiEnvelope(BaseModel):
    """Common shape for API responses."""

    ok: bool = True
    message: str = "success"
    data: Dict = Field(default_factory=dict)
