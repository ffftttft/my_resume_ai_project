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

function TextArea({ value, onChange, placeholder, rows = 5 }) {
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

export default function ExistingResumePanel({
  statusText,
  loading,
  resumeSourceText,
  resumeSourceName,
  jobInfo,
  onResumeSourceChange,
  onJobInfoChange,
  onUploadResumeFile,
  onGenerate,
  onClearInfo,
}) {
  return (
    <section className="paper-panel p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
            Existing Resume
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">已有简历按岗位优化</h2>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]">
        {statusText}
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/72 p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClearInfo}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50"
          >
            清空信息
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || !resumeSourceText.trim()}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "处理中..." : "AI按岗位优化"}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <section className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--ink)]">上传原始简历</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                支持 `PDF / TXT / MD`。上传后会自动提取文本，你也可以继续手动改。
              </p>
            </div>
            <label className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 cursor-pointer">
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(event) => onUploadResumeFile(event.target.files, event.target)}
                className="hidden"
              />
              上传简历
            </label>
          </div>

          {resumeSourceName && (
            <p className="mb-3 text-xs text-[var(--muted)]">当前文件：{resumeSourceName}</p>
          )}

          <TextArea
            value={resumeSourceText}
            onChange={onResumeSourceChange}
            rows={12}
            placeholder="把你已有的简历正文贴到这里，或者先上传 PDF / TXT / MD。"
          />
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
          <h3 className="text-lg font-semibold text-[var(--ink)]">岗位信息</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="求职公司">
              <TextInput
                value={jobInfo.target_company}
                onChange={(value) => onJobInfoChange("target_company", value)}
                placeholder="例如：字节跳动 / 腾讯 / 阿里云"
              />
            </Field>
            <Field label="求职岗位">
              <TextInput
                value={jobInfo.target_role}
                onChange={(value) => onJobInfoChange("target_role", value)}
                placeholder="例如：后端开发工程师"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="招聘要求" hint="粘贴岗位 JD，AI 会据此提问和优化。">
              <TextArea
                value={jobInfo.job_requirements}
                onChange={(value) => onJobInfoChange("job_requirements", value)}
                rows={8}
                placeholder="例如：熟悉 Python / MySQL / Linux，了解接口设计、缓存、性能优化和工程化流程。"
              />
            </Field>
          </div>
        </section>
      </div>
    </section>
  );
}
