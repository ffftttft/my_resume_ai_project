"""Helpers to render validated resume contracts into workspace text and UI metadata."""

from __future__ import annotations

from typing import Dict, Iterable, List

from ai_modules.structured_contracts import (
    ResumeAwardRecord,
    ResumeContact,
    ResumeEducationRecord,
    ResumeExperienceRecord,
    ResumeProjectRecord,
    ResumeSkillCategory,
    StructuredResume,
)


def _clean_lines(lines: Iterable[str]) -> List[str]:
    """Drop empty runs while keeping readable section spacing."""

    cleaned: List[str] = []
    previous_blank = False
    for line in lines:
        normalized = line.rstrip()
        if normalized:
            cleaned.append(normalized)
            previous_blank = False
            continue
        if not previous_blank:
            cleaned.append("")
        previous_blank = True
    while cleaned and not cleaned[-1]:
        cleaned.pop()
    return cleaned


def _join_period(start_date: str, end_date: str) -> str:
    """Render a human-readable time period."""

    start = (start_date or "").strip()
    end = (end_date or "").strip()
    if start and end:
        return f"{start} - {end}"
    return start or end


def _render_contact(contact: ResumeContact) -> List[str]:
    """Render the resume title."""

    lines: List[str] = []
    headline = (contact.full_name or "").strip() or "未命名候选人"
    role = (contact.target_role or "").strip()
    title = f"{headline} · {role}" if role else headline
    lines.extend([f"# {title}", ""])
    return lines


def _render_personal_info(contact: ResumeContact, items: List[ResumeEducationRecord]) -> List[str]:
    """Render contact, target, and education inside the top personal information block."""

    profile_lines = []
    if (contact.full_name or "").strip():
        profile_lines.append(f"姓名：{contact.full_name.strip()}")
    if (contact.email or "").strip():
        profile_lines.append(f"邮箱：{contact.email.strip()}")
    if (contact.phone or "").strip():
        profile_lines.append(f"电话：{contact.phone.strip()}")
    if (contact.city or "").strip():
        profile_lines.append(f"城市：{contact.city.strip()}")
    if (contact.target_company or "").strip():
        profile_lines.append(f"目标公司：{contact.target_company.strip()}")
    if (contact.target_role or "").strip():
        profile_lines.append(f"目标岗位：{contact.target_role.strip()}")

    if not profile_lines and not items:
        return []
    lines = ["## 个人信息"]
    for item in profile_lines:
        lines.append(f"- {item}")

    for item in items:
        heading = " | ".join(
            part
            for part in [
                item.school_name.strip(),
                item.degree.strip(),
                item.major.strip(),
                _join_period(item.start_date, item.end_date),
            ]
            if part
        )
        if heading:
            lines.append(f"- 教育：{heading}")
        for highlight in item.highlights:
            lines.append(f"  - {highlight}")
    return lines + [""]


def _render_experience(items: List[ResumeExperienceRecord]) -> List[str]:
    """Render work and internship history."""

    if not items:
        return []
    lines = ["## 实习经历"]
    for item in items:
        heading = " | ".join(
            part
            for part in [
                item.company_name.strip(),
                item.job_title.strip(),
                _join_period(item.start_date, item.end_date),
            ]
            if part
        )
        lines.append(f"- {heading}")
        if item.role_scope.strip():
            lines.append(f"  - {item.role_scope.strip()}")
        for achievement in item.achievements:
            lines.append(f"  - {achievement}")
        if item.tools:
            lines.append(f"  - 技术栈：{' / '.join(item.tools)}")
    return lines + [""]


def _render_projects(items: List[ResumeProjectRecord]) -> List[str]:
    """Render project history."""

    if not items:
        return []
    lines = ["## 项目经历"]
    for item in items:
        heading = " | ".join(
            part
            for part in [
                item.project_name.strip(),
                item.role.strip(),
                _join_period(item.start_date, item.end_date),
            ]
            if part
        )
        lines.append(f"- {heading}")
        if item.project_summary.strip():
            lines.append(f"  - {item.project_summary.strip()}")
        for achievement in item.achievements:
            lines.append(f"  - {achievement}")
        if item.tools:
            lines.append(f"  - 技术栈：{' / '.join(item.tools)}")
    return lines + [""]


def _render_awards(items: List[ResumeAwardRecord]) -> List[str]:
    """Render awards, scholarships, competitions, certificates, and honors."""

    if not items:
        return []
    lines = ["## 获奖经历"]
    for item in items:
        heading = " | ".join(
            part
            for part in [
                item.award_name.strip(),
                item.level.strip(),
                item.date.strip(),
                item.issuer.strip(),
            ]
            if part
        )
        if heading:
            lines.append(f"- {heading}")
        if item.description.strip():
            if heading:
                lines.append(f"  - {item.description.strip()}")
            else:
                lines.append(f"- {item.description.strip()}")
    return lines + [""]


def _render_skill_categories(skill_categories: List[ResumeSkillCategory]) -> List[str]:
    """Render categorized skills."""

    if not skill_categories:
        return []
    lines = ["## 个人技能"]
    for category in skill_categories:
        items = [item.strip() for item in category.items if item and item.strip()]
        if not items:
            continue
        lines.append(f"- {category.category}: {' / '.join(items)}")
    return lines + [""]


def render_resume_markdown(structured_resume: StructuredResume) -> str:
    """Render the validated contract into stable markdown text."""

    lines: List[str] = []
    lines.extend(_render_contact(structured_resume.contact))
    lines.extend(_render_personal_info(structured_resume.contact, structured_resume.education))
    lines.extend(_render_experience(structured_resume.experience))
    lines.extend(_render_projects(structured_resume.projects))
    lines.extend(_render_awards(structured_resume.awards))
    lines.extend(_render_skill_categories(structured_resume.skills))
    if structured_resume.summary.strip():
        lines.extend(["## 个人总结", "", structured_resume.summary.strip(), ""])
    return "\n".join(_clean_lines(lines))


def build_contract_report(
    structured_resume: StructuredResume,
    renderer: str,
    question_count: int,
    source: str = "model",
    llm_contract_ok: bool = True,
    warning: str = "",
) -> Dict:
    """Create a compact schema status object for the frontend workspace."""

    return {
        "schema_name": "resume_contract",
        "schema_version": "v2",
        "validated": True,
        "renderer": renderer,
        "source": source,
        "llm_contract_ok": bool(llm_contract_ok),
        "warning": (warning or "").strip(),
        "question_count": max(0, int(question_count or 0)),
        "section_counts": {
            "experience": len(structured_resume.experience),
            "projects": len(structured_resume.projects),
            "awards": len(structured_resume.awards),
            "education": len(structured_resume.education),
            "skill_categories": len(structured_resume.skills),
        },
    }
