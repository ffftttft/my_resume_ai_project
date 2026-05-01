import React from "react";
import {
  BadgeCheck,
  CircleDashed,
  ContactRound,
  FolderKanban,
  GraduationCap,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasMetric(values) {
  return asArray(values).some((item) => /\d/.test(asText(item)));
}

function hasDateRange(item) {
  return Boolean(asText(item?.start_date) && asText(item?.end_date));
}

function getStatusTone(status) {
  if (status === "已完整") return "is-complete";
  if (status === "部分缺失") return "is-partial";
  return "is-empty";
}

function evaluateContact(contact) {
  const values = [contact?.full_name, contact?.email, contact?.phone, contact?.city].map(asText);
  const filled = values.filter(Boolean).length;
  if (filled >= 3) return { status: "已完整", hint: "联系方式和基本身份信息已具备。" };
  if (filled > 0) return { status: "部分缺失", hint: "缺少邮箱、电话或城市信息。" };
  return { status: "未生成", hint: "尚未生成结构化联系方式。" };
}

function evaluateSummary(summary) {
  const text = asText(summary);
  if (text.length >= 40) return { status: "已完整", hint: "已有可读的岗位导向摘要。" };
  if (text) return { status: "部分缺失", hint: "摘要偏短，可再补岗位关键词或量化价值。" };
  return { status: "未生成", hint: "尚未生成个人摘要。" };
}

function evaluateSkills(skills) {
  const groups = asArray(skills);
  const totalItems = groups.reduce((sum, group) => sum + asArray(group?.items).length, 0);
  if (groups.length >= 1 && totalItems >= 4) {
    return { status: "已完整", hint: "技能已形成结构化分组。" };
  }
  if (groups.length > 0 || totalItems > 0) {
    return { status: "部分缺失", hint: "缺少技能分组或技能数量偏少。" };
  }
  return { status: "未生成", hint: "尚未生成技能分组。" };
}

function evaluateExperience(items) {
  const list = asArray(items);
  if (list.length === 0) return { status: "未生成", hint: "尚未生成工作/实习经历。" };
  const hasCompleteRecord = list.some(
    (item) =>
      asText(item?.company_name) &&
      asText(item?.job_title) &&
      hasDateRange(item) &&
      asArray(item?.achievements).length > 0,
  );
  if (hasCompleteRecord && hasMetric(list.flatMap((item) => asArray(item?.achievements)))) {
    return { status: "已完整", hint: "经历条目、时间范围和量化结果都已覆盖。" };
  }
  if (hasCompleteRecord) {
    return { status: "部分缺失", hint: "缺少量化结果，可补数字化成果。" };
  }
  return { status: "部分缺失", hint: "缺少时间范围或经历 bullet。" };
}

function evaluateProjects(items) {
  const list = asArray(items);
  if (list.length === 0) return { status: "未生成", hint: "尚未生成项目经历。" };
  const hasCompleteRecord = list.some(
    (item) =>
      asText(item?.project_name) &&
      hasDateRange(item) &&
      (asText(item?.project_summary) || asArray(item?.achievements).length > 0),
  );
  if (hasCompleteRecord && hasMetric(list.flatMap((item) => asArray(item?.achievements)))) {
    return { status: "已完整", hint: "项目背景、时间与成果已具备。" };
  }
  if (hasCompleteRecord) {
    return { status: "部分缺失", hint: "缺少量化结果，可补性能、效率或规模数据。" };
  }
  return { status: "部分缺失", hint: "缺少项目时间范围或项目摘要。" };
}

function evaluateAwards(items) {
  const list = asArray(items);
  if (list.length === 0) return { status: "未生成", hint: "尚未生成获奖经历。" };
  const hasCompleteRecord = list.some(
    (item) => asText(item?.award_name) && (asText(item?.date) || asText(item?.level)),
  );
  if (hasCompleteRecord) {
    return { status: "已完整", hint: "奖项名称、时间或等级已具备。" };
  }
  return { status: "部分缺失", hint: "缺少奖项名称、获奖时间或等级。" };
}

function evaluateEducation(items) {
  const list = asArray(items);
  if (list.length === 0) return { status: "未生成", hint: "尚未生成教育背景。" };
  const hasCompleteRecord = list.some(
    (item) =>
      asText(item?.school_name) &&
      (asText(item?.degree) || asText(item?.major)) &&
      hasDateRange(item),
  );
  if (hasCompleteRecord) {
    return { status: "已完整", hint: "学校、专业和时间范围已具备。" };
  }
  return { status: "部分缺失", hint: "缺少教育时间范围或学位/专业信息。" };
}

export default function ResumeCompletenessCard({ structuredResume }) {
  const modules = [
    {
      label: "联系方式",
      icon: ContactRound,
      ...evaluateContact(structuredResume?.contact || {}),
    },
    {
      label: "个人摘要",
      icon: Sparkles,
      ...evaluateSummary(structuredResume?.summary),
    },
    {
      label: "技能",
      icon: Wrench,
      ...evaluateSkills(structuredResume?.skills),
    },
    {
      label: "工作/实习经历",
      icon: BadgeCheck,
      ...evaluateExperience(structuredResume?.experience),
    },
    {
      label: "项目经历",
      icon: FolderKanban,
      ...evaluateProjects(structuredResume?.projects),
    },
    {
      label: "获奖经历",
      icon: Trophy,
      ...evaluateAwards(structuredResume?.awards),
    },
    {
      label: "教育背景",
      icon: GraduationCap,
      ...evaluateEducation(structuredResume?.education),
    },
  ];

  const hasStructuredContent = modules.some((item) => item.status !== "未生成");

  return (
    <section className="paper-panel resume-completeness-card p-6 lg:p-7">
      <div className="resume-completeness-card__header">
        <div>
          <p className="resume-completeness-card__eyebrow">完成情况</p>
          <h2 className="resume-completeness-card__title">当前简历完成情况</h2>
          <p className="resume-completeness-card__copy">
            {hasStructuredContent
              ? "按模块查看当前简历哪些部分已经完整、哪些还缺时间范围、量化结果或技能分组。"
              : "生成或优化出结构化简历后，这里会按模块展示当前完成情况。"}
          </p>
        </div>
        <span className="chip">{hasStructuredContent ? "结构化结果已接入" : "等待结构化结果"}</span>
      </div>

      <div className="resume-completeness-card__grid">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`resume-completeness-card__item ${getStatusTone(item.status)}`}
            >
              <div className="resume-completeness-card__item-head">
                <span className="resume-completeness-card__icon">
                  <Icon size={16} />
                </span>
                <span className="chip">{item.status}</span>
              </div>
              <h3>{item.label}</h3>
              <p>{item.hint}</p>
            </article>
          );
        })}
      </div>

      {!hasStructuredContent ? (
        <div className="resume-completeness-card__empty">
          <CircleDashed size={16} />
          <span>当前没有可分析的结构化简历内容。</span>
        </div>
      ) : null}
    </section>
  );
}
