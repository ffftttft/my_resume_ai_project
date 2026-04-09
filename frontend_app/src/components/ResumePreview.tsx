import React from "react";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";

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
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || "";
}

function normalizeSkillGroups(value) {
  return toObjectArray(value)
    .map((group) => ({
      category: asText(group.category, "技能分组"),
      items: toTextArray(group.items),
    }))
    .filter((group) => group.category || group.items.length > 0);
}

function SurfaceHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-[var(--accent)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <Icon size={18} strokeWidth={2.1} />
        </span>
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">{title}</h3>
      </div>
      {subtitle ? <p className="text-sm leading-7 text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function ContactPill({ icon: Icon, children }) {
  if (!children) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/72 px-3 py-1.5 text-sm text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
      <Icon size={14} strokeWidth={2.1} />
      {children}
    </span>
  );
}

function PreviewSkeleton({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-full bg-slate-200/80 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.78),transparent)]"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function EmptyState({ copy }) {
  return <p className="text-sm leading-7 text-slate-500">{copy}</p>;
}

function DetailList({ items }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 pl-4 text-sm leading-7 text-slate-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function EntryCard({ title, meta = [], summary, bullets = [] }) {
  return (
    <article className="rounded-[26px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <div className="space-y-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          {meta.length > 0 ? (
            <div className="mt-2 space-y-1.5 text-sm leading-7 text-slate-500">
              {meta.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
        </div>

        {summary ? <p className="text-sm leading-7 text-slate-600">{summary}</p> : null}

        <DetailList items={bullets} />
      </div>
    </article>
  );
}

function renderEntryList(items, emptyCopy, mapper) {
  if (items.length === 0) {
    return <EmptyState copy={emptyCopy} />;
  }

  return <div className="space-y-4">{items.map(mapper)}</div>;
}

export default function ResumePreview({
  structuredResume,
  draftText,
  isStreaming,
  streamStatus,
  generationMode,
}) {
  const contact = asObject(structuredResume?.contact);
  const summary = asText(structuredResume?.summary);
  const experience = toObjectArray(structuredResume?.experience);
  const projects = toObjectArray(structuredResume?.projects);
  const education = toObjectArray(structuredResume?.education);
  const skills = normalizeSkillGroups(structuredResume?.skills);
  const draftTextValue = typeof draftText === "string" ? draftText : "";
  const hasStructuredContent =
    Boolean(summary) ||
    experience.length > 0 ||
    projects.length > 0 ||
    education.length > 0 ||
    skills.length > 0;
  const streamDraftTail = draftTextValue
    ? draftTextValue.length > 1800
      ? draftTextValue.slice(-1800)
      : draftTextValue
    : "";
  const targetMeta = [asText(contact.target_role), asText(contact.target_company)]
    .filter(Boolean)
    .join(" / ");
  const previewStatus = isStreaming
    ? "流式生成中"
    : generationMode === "openai"
      ? "AI 校验通过"
      : "本地预览";

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/78 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-7">
      <motion.div
        className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(82,145,255,0.18),transparent_70%)] blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -10, 0], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-0 h-44 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,91,178,0.16),transparent_72%)] blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 12, 0], opacity: [0.48, 0.82, 0.48] }}
        transition={{ duration: 5.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-b-full bg-[radial-gradient(circle_at_center,rgba(200,116,42,0.16),transparent_72%)]" />

      <div className="relative flex flex-col gap-5 border-b border-slate-200/80 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
              实时简历预览
            </p>
            <h2 className="mt-3 font-['Instrument_Serif'] text-3xl leading-none text-slate-900 lg:text-4xl">
              {asText(contact.full_name) || asText(contact.target_role) || "结构化草稿"}
            </h2>
            {targetMeta ? <p className="mt-3 text-base text-slate-500">{targetMeta}</p> : null}
          </div>

          <div className="flex flex-col items-start gap-2 text-sm text-slate-500 lg:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/72 px-3 py-1.5 font-semibold text-slate-700">
              <Sparkles size={15} strokeWidth={2.1} />
              {previewStatus}
            </span>
            {streamStatus ? (
              <p className="max-w-xl text-left leading-6 text-slate-500 lg:max-w-[24rem] lg:text-right">
                {streamStatus}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <ContactPill icon={Mail}>{asText(contact.email)}</ContactPill>
          <ContactPill icon={Phone}>{asText(contact.phone)}</ContactPill>
          <ContactPill icon={MapPin}>{asText(contact.city)}</ContactPill>
        </div>
      </div>

      <div className="relative mt-6 space-y-6">
        <article className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,252,0.9))] p-5">
          <SurfaceHeading
            icon={Sparkles}
            title="个人总结"
            subtitle="先沉淀一句能说明你是谁、做过什么、能为目标岗位带来什么的核心描述。"
          />
          <div className="mt-4">
            {summary ? (
              <p className="text-[15px] leading-8 text-slate-700">{summary}</p>
            ) : isStreaming ? (
              <div className="space-y-3">
                <PreviewSkeleton className="h-3.5 w-full" />
                <PreviewSkeleton className="h-3.5 w-10/12" />
                <PreviewSkeleton className="h-3.5 w-8/12" />
              </div>
            ) : (
              <EmptyState copy="开始生成后，这里会优先显示结构化总结。" />
            )}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5">
          <SurfaceHeading
            icon={Wrench}
            title="核心技能"
            subtitle="技能按分组纵向展开，避免一整行横向堆叠。"
          />
          <div className="mt-4 space-y-4">
            {skills.length > 0 ? (
              skills.map((group, index) => (
                <div
                  key={`${group.category || "skill-group"}-${index}`}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/85 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {group.category}
                  </p>
                  <DetailList items={group.items} />
                </div>
              ))
            ) : isStreaming ? (
              <div className="space-y-4">
                <PreviewSkeleton className="h-16 w-full rounded-[22px]" />
                <PreviewSkeleton className="h-16 w-10/12 rounded-[22px]" />
              </div>
            ) : (
              <EmptyState copy="JSON 契约补全后，这里会生成按组拆分的技能列表。" />
            )}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5">
          <SurfaceHeading
            icon={BriefcaseBusiness}
            title="工作经历"
            subtitle="每段经历按公司、岗位、时间、职责和成果纵向排布。"
          />
          <div className="mt-4">
            {isStreaming && experience.length === 0 ? (
              <div className="space-y-4">
                <PreviewSkeleton className="h-20 w-full rounded-[24px]" />
                <PreviewSkeleton className="h-20 w-11/12 rounded-[24px]" />
              </div>
            ) : (
              renderEntryList(
                experience,
                "结构化结果可用后，这里会纵向展开每段工作经历。",
                (item, index) => (
                  <EntryCard
                    key={`${asText(item.company_name, "experience")}-${index}`}
                    title={asText(item.company_name) || asText(item.job_title) || "工作经历"}
                    meta={[
                      asText(item.job_title) ? `岗位：${asText(item.job_title)}` : "",
                      formatPeriod(item.start_date, item.end_date)
                        ? `时间：${formatPeriod(item.start_date, item.end_date)}`
                        : "",
                    ].filter(Boolean)}
                    summary={asText(item.role_scope)}
                    bullets={toTextArray(item.achievements)}
                  />
                ),
              )
            )}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5">
          <SurfaceHeading
            icon={Sparkles}
            title="项目经历"
            subtitle="项目单独成段，角色、周期、概述和亮点全部向下展开。"
          />
          <div className="mt-4">
            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((item, index) => (
                  <EntryCard
                    key={`${asText(item.project_name, "project")}-${index}`}
                    title={asText(item.project_name) || "项目经历"}
                    meta={[
                      asText(item.role) ? `角色：${asText(item.role)}` : "",
                      formatPeriod(item.start_date, item.end_date)
                        ? `时间：${formatPeriod(item.start_date, item.end_date)}`
                        : "",
                    ].filter(Boolean)}
                    summary={asText(item.project_summary)}
                    bullets={toTextArray(item.achievements)}
                  />
                ))}
              </div>
            ) : isStreaming ? (
              <div className="space-y-4">
                <PreviewSkeleton className="h-20 w-full rounded-[22px]" />
              </div>
            ) : (
              <EmptyState copy="有足够项目材料时，这里会自动拆成纵向项目卡片。" />
            )}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5">
          <SurfaceHeading
            icon={GraduationCap}
            title="教育背景"
            subtitle="学校、学位、专业、时间和补充亮点按单列顺序展示。"
          />
          <div className="mt-4">
            {isStreaming && education.length === 0 ? (
              <div className="space-y-4">
                <PreviewSkeleton className="h-16 w-full rounded-[20px]" />
              </div>
            ) : (
              renderEntryList(
                education,
                "教育信息补全后，这里会显示纵向教育卡片。",
                (item, index) => (
                  <EntryCard
                    key={`${asText(item.school_name, "education")}-${index}`}
                    title={asText(item.school_name) || "教育背景"}
                    meta={[
                      asText(item.degree) ? `学位：${asText(item.degree)}` : "",
                      asText(item.major) ? `专业：${asText(item.major)}` : "",
                      formatPeriod(item.start_date, item.end_date)
                        ? `时间：${formatPeriod(item.start_date, item.end_date)}`
                        : "",
                    ].filter(Boolean)}
                    bullets={toTextArray(item.highlights)}
                  />
                ),
              )
            )}
          </div>
        </article>

        {draftTextValue && (isStreaming || !hasStructuredContent) ? (
          <article className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/75 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {isStreaming ? "流式 JSON 通道" : "结构化 JSON 结果"}
              </p>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                {draftTextValue.length} 字符
              </span>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-600">
              {streamDraftTail}
            </pre>
          </article>
        ) : null}
      </div>
    </section>
  );
}
