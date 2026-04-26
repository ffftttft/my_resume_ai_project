import React from "react";
import {
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";
import { StreamingTextContainer } from "./LoadingIndicators";

function asText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObjectArray(value) {
  return asArray(value).filter((item) => item && typeof item === "object" && !Array.isArray(item));
}

function toTextArray(value) {
  return asArray(value)
    .map((item) => asText(item))
    .filter(Boolean);
}

function formatPeriod(startDate, endDate) {
  const start = asText(startDate);
  const end = asText(endDate);
  if (start && end) return `${start} - ${end}`;
  return start || end || "";
}

function EmptyState({ children }) {
  return <p className="text-sm leading-6 text-gray-500">{children}</p>;
}

function PreviewCard({ icon: Icon, title, subtitle, actions = null, children }) {
  return (
    <article className="resume-workbench-card custom-scrollbar flex max-h-[500px] min-w-0 flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="resume-workbench-card__head flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900" title={title}>
              {title}
            </h3>
            {subtitle ? (
              <p
                className="resume-workbench-card__subtitle mt-1 truncate text-sm leading-6 text-gray-500"
                title={subtitle}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-4">{children}</div>
    </article>
  );
}

function MetaPill({ icon: Icon, value }) {
  if (!value) return null;
  return (
    <span className="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
      <Icon size={14} />
      {value}
    </span>
  );
}

function EntryBlock({ title, meta = [], summary, bullets = [], tools = [], isStreaming = false }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {meta.length > 0 ? (
          <div className="space-y-1 text-xs uppercase tracking-[0.12em] text-gray-500">
            {meta.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        ) : null}
        {summary ? (
          <StreamingTextContainer isStreaming={isStreaming}>
            <p className="text-sm leading-6 text-gray-600">{summary}</p>
          </StreamingTextContainer>
        ) : null}
        {bullets.length > 0 ? (
          <ul className="space-y-2 pl-4 text-sm leading-6 text-gray-700">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {tools.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <span
                key={tool}
                className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600"
              >
                {tool}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkillsPanel({ skills }) {
  if (skills.length === 0) {
    return <EmptyState>生成或优化完成后，这里会展示结构化技能分组。</EmptyState>;
  }

  return skills.map((group, index) => (
    <div
      key={`${group.category || "skill-group"}-${index}`}
      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {asText(group.category, "技能分组")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {toTextArray(group.items).map((item) => (
          <span
            key={item}
            className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  ));
}

export default function ResumeWorkbenchPreview({
  boardLabel,
  title,
  structuredResume,
  resumeText,
  generationMode,
  isStreaming,
  streamStatus,
  summaryItems = [],
}) {
  const contact = asObject(structuredResume?.contact);
  const summary = asText(structuredResume?.summary);
  const skills = toObjectArray(structuredResume?.skills);
  const experience = toObjectArray(structuredResume?.experience);
  const projects = toObjectArray(structuredResume?.projects);
  const education = toObjectArray(structuredResume?.education);
  const hasResumeText = Boolean(asText(resumeText));
  const headerTitle = asText(title) || asText(contact.target_role) || `${boardLabel}结果预览`;
  const statusLabel = isStreaming
    ? "流式写入中"
    : generationMode === "openai"
      ? "AI 结果"
      : "回退结果";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-600">
              预览工作区
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{headerTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              这里只展示结构化结果与摘要卡，编辑、改写、保存和导出已经移动到右侧草稿实验台。
            </p>
            {streamStatus ? <p className="mt-3 text-sm leading-6 text-indigo-600">{streamStatus}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
              {statusLabel}
            </span>
            <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
              {hasResumeText ? `${resumeText.trim().length} 字符` : "暂无草稿"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PreviewCard icon={Sparkles} title="个人概述" subtitle="展示候选人身份与目标岗位。">
          <div className="space-y-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                {asText(contact.full_name) || asText(contact.target_role) || "等待结构化结果"}
              </h3>
              {asText(contact.target_role) || asText(contact.target_company) ? (
                <p className="mt-2 text-sm text-gray-500">
                  {[asText(contact.target_role), asText(contact.target_company)].filter(Boolean).join(" / ")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <MetaPill icon={Mail} value={asText(contact.email)} />
              <MetaPill icon={Phone} value={asText(contact.phone)} />
              <MetaPill icon={MapPin} value={asText(contact.city)} />
            </div>

            {summary ? (
              <StreamingTextContainer isStreaming={isStreaming}>
                <p className="text-sm leading-7 text-gray-700">{summary}</p>
              </StreamingTextContainer>
            ) : (
              <EmptyState>模型锁定有效 contract 后，这里会展示结构化个人摘要。</EmptyState>
            )}
          </div>
        </PreviewCard>

        <PreviewCard icon={Wrench} title="核心技能" subtitle="按分组查看结构化技能。">
          <SkillsPanel skills={skills} />
        </PreviewCard>

        <PreviewCard
          icon={BriefcaseBusiness}
          title="工作经历"
          subtitle="工作内容较长时仅在卡内滚动。"
        >
          {experience.length > 0 ? (
            experience.map((item, index) => (
              <EntryBlock
                key={`${asText(item.company_name, "experience")}-${index}`}
                title={asText(item.company_name) || asText(item.job_title) || "工作经历"}
                meta={[asText(item.job_title) || "", formatPeriod(item.start_date, item.end_date)].filter(
                  Boolean,
                )}
                summary={asText(item.role_scope)}
                bullets={toTextArray(item.achievements)}
                tools={toTextArray(item.tools)}
                isStreaming={isStreaming}
              />
            ))
          ) : (
            <EmptyState>生成或优化完成后，这里会展示结构化工作经历。</EmptyState>
          )}
        </PreviewCard>

        <PreviewCard
          icon={FolderKanban}
          title="项目经历"
          subtitle="保留角色、周期、成果与技术栈。"
        >
          {projects.length > 0 ? (
            projects.map((item, index) => (
              <EntryBlock
                key={`${asText(item.project_name, "project")}-${index}`}
                title={asText(item.project_name) || "项目经历"}
                meta={[asText(item.role) || "", formatPeriod(item.start_date, item.end_date)].filter(
                  Boolean,
                )}
                summary={asText(item.project_summary)}
                bullets={toTextArray(item.achievements)}
                tools={toTextArray(item.tools)}
                isStreaming={isStreaming}
              />
            ))
          ) : (
            <EmptyState>当 contract 中包含项目记录后，这里会自动展示项目经历。</EmptyState>
          )}
        </PreviewCard>

        <PreviewCard
          icon={GraduationCap}
          title="教育背景"
          subtitle="学校、学位、专业与亮点概览。"
        >
          {education.length > 0 ? (
            education.map((item, index) => (
              <EntryBlock
                key={`${asText(item.school_name, "education")}-${index}`}
                title={asText(item.school_name) || "教育背景"}
                meta={[
                  asText(item.degree) || "",
                  asText(item.major) || "",
                  formatPeriod(item.start_date, item.end_date),
                ].filter(Boolean)}
                bullets={toTextArray(item.highlights)}
              />
            ))
          ) : (
            <EmptyState>结构化教育信息准备完成后，这里会自动更新。</EmptyState>
          )}
        </PreviewCard>

        <PreviewCard
          icon={FileText}
          title="信息摘要"
          subtitle="主舞台的目标、JD 和素材快照。"
        >
          {summaryItems.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-900" title={item.value}>
                    {item.value}
                  </p>
                  <p
                    className="mt-1 text-xs leading-5 text-gray-500"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={item.meta}
                  >
                    {item.meta}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>当前还没有可展示的摘要信息。</EmptyState>
          )}
        </PreviewCard>
      </section>
    </div>
  );
}
