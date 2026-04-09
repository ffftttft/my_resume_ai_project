"""Helpers to render validated resume contracts into workspace text and UI metadata."""

from __future__ import annotations

from typing import Dict, Iterable, List

from ai_modules.structured_contracts import (
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
    """Render header contact rows."""

    lines: List[str] = []
    headline = (contact.full_name or "").strip() or "未命名候选人"
    role = (contact.target_role or "").strip()
    title = f"{headline} · {role}" if role else headline
    lines.extend([f"# {title}", ""])

    details = [contact.email, contact.phone, contact.city]
    details = [item.strip() for item in details if item and item.strip()]
    if details:
        lines.extend([" | ".join(details), ""])

    target_lines = []
    if (contact.target_company or "").strip():
        target_lines.append(f"目标公司：{contact.target_company.strip()}")
    if role:
        target_lines.append(f"目标岗位：{role}")
    if target_lines:
        lines.extend(target_lines + [""])
    return lines


def _render_skill_categories(skill_categories: List[ResumeSkillCategory]) -> List[str]:
    """Render categorized skills."""

    if not skill_categories:
        return []
    lines = ["## 核心技能"]
    for category in skill_categories:
        items = [item.strip() for item in category.items if item and item.strip()]
        if not items:
            continue
        lines.append(f"- {category.category}: {' / '.join(items)}")
    return lines + [""]


def _render_education(items: List[ResumeEducationRecord]) -> List[str]:
    """Render education list."""

    if not items:
        return []
    lines = ["## 教育背景"]
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
        lines.append(f"- {heading}")
        for highlight in item.highlights:
            lines.append(f"  - {highlight}")
    return lines + [""]


def _render_experience(items: List[ResumeExperienceRecord]) -> List[str]:
    """Render work and internship history."""

    if not items:
        return []
    lines = ["## 工作经历"]
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


def render_resume_markdown(structured_resume: StructuredResume) -> str:
    """Render the validated contract into stable markdown text."""

    lines: List[str] = []
    lines.extend(_render_contact(structured_resume.contact))
    if structured_resume.summary.strip():
        lines.extend(["## 个人总结", f"- {structured_resume.summary.strip()}", ""])
    lines.extend(_render_skill_categories(structured_resume.skills))
    lines.extend(_render_experience(structured_resume.experience))
    lines.extend(_render_projects(structured_resume.projects))
    lines.extend(_render_education(structured_resume.education))
    return "\n".join(_clean_lines(lines))


def build_contract_report(structured_resume: StructuredResume, renderer: str, question_count: int) -> Dict:
    """Create a compact schema status object for the frontend workspace."""

    return {
        "schema_name": "resume_contract",
        "schema_version": "v1",
        "validated": True,
        "renderer": renderer,
        "question_count": max(0, int(question_count or 0)),
        "section_counts": {
            "experience": len(structured_resume.experience),
            "projects": len(structured_resume.projects),
            "education": len(structured_resume.education),
            "skill_categories": len(structured_resume.skills),
        },
    }
