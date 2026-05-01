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

function renderContact(contact = {}) {
  const lines = [];
  const fullName = asText(contact.full_name) || "未命名候选人";
  const targetRole = asText(contact.target_role);
  const title = targetRole ? `${fullName} · ${targetRole}` : fullName;

  lines.push(`# ${title}`, "");

  return lines;
}

function renderPersonalInfo(contact = {}, educationItems = []) {
  const profileLines = [
    ["姓名", contact.full_name],
    ["邮箱", contact.email],
    ["电话", contact.phone],
    ["城市", contact.city],
    ["目标公司", contact.target_company],
    ["目标岗位", contact.target_role],
  ]
    .map(([label, value]) => [label, asText(value)])
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}：${value}`);
  const list = asList(educationItems);
  if (profileLines.length === 0 && list.length === 0) {
    return [];
  }

  const lines = ["## 个人信息"];
  profileLines.forEach((item) => {
    lines.push(`- ${item}`);
  });

  list.forEach((item) => {
    const heading = [
      item?.school_name,
      item?.degree,
      item?.major,
      joinPeriod(item?.start_date, item?.end_date),
    ]
      .map((value) => asText(value))
      .filter(Boolean)
      .join(" | ");
    if (heading) {
      lines.push(`- 教育：${heading}`);
    }
    asList(item?.highlights)
      .map((highlight) => asText(highlight))
      .filter(Boolean)
      .forEach((highlight) => {
        lines.push(`  - ${highlight}`);
      });
  });

  return [...lines, ""];
}

function renderExperience(items = []) {
  const list = asList(items);
  if (list.length === 0) {
    return [];
  }

  const lines = ["## 实习经历"];
  list.forEach((item) => {
    const heading = [
      item?.company_name,
      item?.job_title,
      joinPeriod(item?.start_date, item?.end_date),
    ]
      .map((value) => asText(value))
      .filter(Boolean)
      .join(" | ");

    lines.push(`- ${heading || "实习经历"}`);
    if (asText(item?.role_scope)) {
      lines.push(`  - ${asText(item.role_scope)}`);
    }
    asList(item?.achievements)
      .map((achievement) => asText(achievement))
      .filter(Boolean)
      .forEach((achievement) => {
        lines.push(`  - ${achievement}`);
      });
    const tools = asList(item?.tools)
      .map((tool) => asText(tool))
      .filter(Boolean);
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
    const heading = [
      item?.project_name,
      item?.role,
      joinPeriod(item?.start_date, item?.end_date),
    ]
      .map((value) => asText(value))
      .filter(Boolean)
      .join(" | ");

    lines.push(`- ${heading || "项目经历"}`);
    if (asText(item?.project_summary)) {
      lines.push(`  - ${asText(item.project_summary)}`);
    }
    asList(item?.achievements)
      .map((achievement) => asText(achievement))
      .filter(Boolean)
      .forEach((achievement) => {
        lines.push(`  - ${achievement}`);
      });
    const tools = asList(item?.tools)
      .map((tool) => asText(tool))
      .filter(Boolean);
    if (tools.length > 0) {
      lines.push(`  - 技术栈：${tools.join(" / ")}`);
    }
  });

  return [...lines, ""];
}

function renderAwards(items = []) {
  const list = asList(items);
  if (list.length === 0) {
    return [];
  }

  const lines = ["## 获奖经历"];
  list.forEach((item) => {
    const heading = [item?.award_name, item?.level, item?.date, item?.issuer]
      .map((value) => asText(value))
      .filter(Boolean)
      .join(" | ");
    if (heading) {
      lines.push(`- ${heading}`);
    }
    if (asText(item?.description)) {
      lines.push(heading ? `  - ${asText(item.description)}` : `- ${asText(item.description)}`);
    }
  });

  return [...lines, ""];
}

function renderSkills(skillCategories = []) {
  const items = asList(skillCategories);
  if (items.length === 0) {
    return [];
  }

  const lines = ["## 个人技能"];
  items.forEach((category) => {
    const label = asText(category?.category) || "技能分组";
    const skills = asList(category?.items)
      .map((item) => asText(item))
      .filter(Boolean);

    if (skills.length > 0) {
      lines.push(`- ${label}: ${skills.join(" / ")}`);
    }
  });

  return [...lines, ""];
}

function renderSummary(summary) {
  const text = asText(summary);
  if (!text) {
    return [];
  }

  return ["## 个人总结", "", text, ""];
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
  pushSection(lines, renderPersonalInfo(structuredResume?.contact, structuredResume?.education));
  pushSection(lines, renderExperience(structuredResume?.experience));
  pushSection(lines, renderProjects(structuredResume?.projects));
  pushSection(lines, renderAwards(structuredResume?.awards));
  pushSection(lines, renderSkills(structuredResume?.skills));
  pushSection(lines, renderSummary(structuredResume?.summary));

  return cleanLines(lines).join("\n");
}
