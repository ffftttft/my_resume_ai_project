import React from "react";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="field-shell w-full px-4 py-3 outline-none"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 6 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="field-shell w-full resize-y px-4 py-3 outline-none"
    />
  );
}

export default function JobTargetSection({
  jobInfo,
  onFieldChange,
  onApplyGenericJobInfo,
  actionLabel = "使用通用选项",
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink)]">岗位信息</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            两种模式这里保持同一格式。公司、岗位名称、招聘要求都是必填；如果暂时没有明确目标，可以一键使用通用选项。
          </p>
        </div>
        <button
          type="button"
          onClick={onApplyGenericJobInfo}
          className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent)] transition hover:brightness-105"
        >
          {actionLabel}
        </button>
      </div>

      <div className="mt-4 rounded-[18px] border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]">
        AI 会优先根据岗位要求、常见技能和缺失模块提问，单轮最多 3 个问题。
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="公司">
          <TextInput
            value={jobInfo.target_company}
            onChange={(value) => onFieldChange("target_company", value)}
            placeholder="例如：字节跳动 / 腾讯 / 阿里巴巴"
          />
        </Field>
        <Field label="岗位名称">
          <TextInput
            value={jobInfo.target_role}
            onChange={(value) => onFieldChange("target_role", value)}
            placeholder="例如：后端开发工程师"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="招聘要求" hint="粘贴岗位 JD，AI 会据此生成和提问">
          <TextArea
            value={jobInfo.job_requirements}
            onChange={(value) => onFieldChange("job_requirements", value)}
            rows={7}
            placeholder="例如：熟悉 Python / MySQL / Linux，了解接口设计、性能优化和工程化流程。"
          />
        </Field>
      </div>
    </section>
  );
}
