import React from "react";

function Field({ label, children, hint }) {
  return (
    <label className="job-target__field">
      <div className="job-target__field-head">
        <span className="job-target__field-label">{label}</span>
        {hint ? <span className="job-target__field-hint">{hint}</span> : null}
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
  eyebrow = "",
  title = "岗位目标",
  description = "填写目标公司、岗位名称和 JD，AI 会严格围绕这里的岗位目标生成或优化简历。",
  highlightText = "",
  actions = null,
}) {
  return (
    <section className="paper-panel job-target p-6">
      <div className="job-target__header">
        <div className="max-w-3xl">
          {eyebrow ? <p className="job-target__eyebrow">{eyebrow}</p> : null}
          <h3 className="job-target__title">{title}</h3>
          <p className="job-target__description">{description}</p>
        </div>

        {actions ? <div className="job-target__controls">{actions}</div> : null}
      </div>

      {highlightText ? <div className="job-target__callout">{highlightText}</div> : null}

      <div className="job-target__grid">
        <Field label="目标公司">
          <TextInput
            value={jobInfo.target_company}
            onChange={(value) => onFieldChange("target_company", value)}
            placeholder="例如：字节跳动 / 腾讯 / 阿里巴巴"
          />
        </Field>
        <Field label="目标岗位">
          <TextInput
            value={jobInfo.target_role}
            onChange={(value) => onFieldChange("target_role", value)}
            placeholder="例如：后端开发工程师"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="岗位要求" hint="建议直接粘贴 JD">
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
