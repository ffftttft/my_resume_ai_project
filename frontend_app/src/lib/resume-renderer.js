function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function joinPeriod(startDate, endDate) {
  const start = asText(startDate);
  const end = asText(endDate);
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

function pushSection(lines, values) {
  values.forEach((value) => {
    if (typeof value === "string") {
      lines.push(value);
    }
  });
}

function pushNestedList(lines, items, indent = "  - ") {
  asList(items)
    .map((item) => asText(item))
    .filter(Boolean)
    .forEach((item) => {
      lines.push(`${indent}${item}`);
    });
}

function renderContact(contact = {}) {
  const lines = [];
  const fullName = asText(contact.full_name) || "未命名候选人";
  const targetRole = asText(contact.target_role);
  const title = targetRole ? `${fullName} / ${targetRole}` : fullName;

  lines.push(`# ${title}`, "");

  const details = [contact.email, contact.phone, contact.city]
    .map((item) => asText(item))
    .filter(Boolean);
  if (details.length > 0) {
    lines.push(details.join(" | "));
  }

  if (asText(contact.target_company)) {
    lines.push(`目标公司：${asText(contact.target_company)}`);
  }
  if (targetRole) {
    lines.push(`目标岗位：${targetRole}`);
  }

  if (details.length > 0 || asText(contact.target_company) || targetRole) {
    lines.push("");
  }

  return lines;
}

function renderSummary(summary) {
  const text = asText(summary);
  if (!text) {
    return [];
  }

  return ["## 个人总结", `- ${text}`, ""];
}

function renderSkills(skillCategories = []) {
  const items = asList(skillCategories);
  if (items.length === 0) {
    return [];
  }

  const lines = ["## 核心技能"];
  items.forEach((category) => {
    const label = asText(category?.category);
    const skills = asList(category?.items)
      .map((item) => asText(item))
      .filter(Boolean);

    if (!label && skills.length === 0) {
      return;
    }

    lines.push(`- ${label || "技能分组"}`);
    pushNestedList(lines, skills);
  });

  return [...lines, ""];
}

function renderExperience(items = []) {
  const list = asList(items);
  if (list.length === 0) {
    return [];
  }

  const lines = ["## 工作经历"];
  list.forEach((item) => {
    const company = asText(item?.company_name);
    const jobTitle = asText(item?.job_title);
    const period = joinPeriod(item?.start_date, item?.end_date);
    const achievements = asList(item?.achievements)
      .map((achievement) => asText(achievement))
      .filter(Boolean);
    const tools = asList(item?.tools)
      .map((tool) => asText(tool))
      .filter(Boolean);

    lines.push(`- ${company || jobTitle || "工作经历"}`);
    if (jobTitle) {
      lines.push(`  - 岗位：${jobTitle}`);
    }
    if (period) {
      lines.push(`  - 时间：${period}`);
    }
    if (asText(item?.role_scope)) {
      lines.push(`  - 职责：${asText(item.role_scope)}`);
    }
    if (achievements.length > 0) {
      lines.push("  - 关键成果：");
      achievements.forEach((achievement) => {
        lines.push(`    - ${achievement}`);
      });
    }
    if (tools.length > 0) {
      lines.push(`  - 技术栈：${tools.join(" / ")}`);
    }
  });

  return [...lines, ""];
}

function renderProjects(items = []) {
  const list = asList(items);
  if (list.length === 0) {
    return [];
  }

  const lines = ["## 项目经历"];
  list.forEach((item) => {
    const projectName = asText(item?.project_name);
    const role = asText(item?.role);
    const period = joinPeriod(item?.start_date, item?.end_date);
    const achievements = asList(item?.achievements)
      .map((achievement) => asText(achievement))
      .filter(Boolean);
    const tools = asList(item?.tools)
      .map((tool) => asText(tool))
      .filter(Boolean);

    lines.push(`- ${projectName || role || "项目经历"}`);
    if (role) {
      lines.push(`  - 角色：${role}`);
    }
    if (period) {
      lines.push(`  - 时间：${period}`);
    }
    if (asText(item?.project_summary)) {
      lines.push(`  - 概述：${asText(item.project_summary)}`);
    }
    if (achievements.length > 0) {
      lines.push("  - 项目亮点：");
      achievements.forEach((achievement) => {
        lines.push(`    - ${achievement}`);
      });
    }
    if (tools.length > 0) {
      lines.push(`  - 技术栈：${tools.join(" / ")}`);
    }
  });

  return [...lines, ""];
}

function renderEducation(items = []) {
  const list = asList(items);
  if (list.length === 0) {
    return [];
  }

  const lines = ["## 教育背景"];
  list.forEach((item) => {
    const school = asText(item?.school_name);
    const degree = asText(item?.degree);
    const major = asText(item?.major);
    const period = joinPeriod(item?.start_date, item?.end_date);
    const highlights = asList(item?.highlights)
      .map((highlight) => asText(highlight))
      .filter(Boolean);

    lines.push(`- ${school || degree || major || "教育经历"}`);
    if (degree) {
      lines.push(`  - 学位：${degree}`);
    }
    if (major) {
      lines.push(`  - 专业：${major}`);
    }
    if (period) {
      lines.push(`  - 时间：${period}`);
    }
    if (highlights.length > 0) {
      lines.push("  - 补充亮点：");
      highlights.forEach((highlight) => {
        lines.push(`    - ${highlight}`);
      });
    }
  });

  return [...lines, ""];
}

function cleanLines(lines) {
  const cleaned = [];
  let previousBlank = false;

  lines.forEach((line) => {
    const normalized = typeof line === "string" ? line.trimEnd() : "";
    if (normalized) {
      cleaned.push(normalized);
      previousBlank = false;
      return;
    }
    if (!previousBlank) {
      cleaned.push("");
    }
    previousBlank = true;
  });

  while (cleaned.length > 0 && cleaned[cleaned.length - 1] === "") {
    cleaned.pop();
  }

  return cleaned;
}

export function renderStructuredResumeMarkdown(structuredResume = {}) {
  const lines = [];

  pushSection(lines, renderContact(structuredResume?.contact));
  pushSection(lines, renderSummary(structuredResume?.summary));
  pushSection(lines, renderSkills(structuredResume?.skills));
  pushSection(lines, renderExperience(structuredResume?.experience));
  pushSection(lines, renderProjects(structuredResume?.projects));
  pushSection(lines, renderEducation(structuredResume?.education));

  return cleanLines(lines).join("\n");
}
