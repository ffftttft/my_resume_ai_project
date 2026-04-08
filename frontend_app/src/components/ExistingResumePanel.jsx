import React from "react";

import JobTargetSection from "./JobTargetSection";
import UploadDropZone from "./UploadDropZone";

function TextArea({ value, onChange, placeholder, rows = 14 }) {
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
  jobInfoReady,
  resumeSourceText,
  resumeSourceName,
  jobInfo,
  onResumeSourceChange,
  onJobInfoChange,
  onApplyGenericJobInfo,
  onUploadResumeFile,
  onGenerate,
  onClearInfo,
}) {
  return (
    <section className="paper-panel flex h-full min-h-0 flex-col overflow-hidden p-6 lg:p-7">
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

      <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[26px] border border-slate-200 bg-white/62">
        <div className="panel-scroll-shell h-full min-h-0 space-y-5 overflow-y-scroll p-5 pr-3">
          <JobTargetSection
            jobInfo={jobInfo}
            onFieldChange={onJobInfoChange}
            onApplyGenericJobInfo={onApplyGenericJobInfo}
          />

          <section className="rounded-[24px] border border-slate-200 bg-white/78 p-5">
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
                disabled={loading || !resumeSourceText.trim() || !jobInfoReady}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "处理中..." : "AI 按岗位优化"}
              </button>
            </div>

            <p className="mt-3 text-xs text-[var(--muted)]">
              下方白色区域会直接铺满到底部，岗位信息和上传区都在这里滚动，避免右侧再次被内容撑长。
            </p>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white/78 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-[var(--ink)]">上传原始简历</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                支持点击上传或直接拖拽。可上传 `PDF / TXT / MD / DOC / DOCX`，上传后会自动提取正文，你也可以继续手动修改。
              </p>
            </div>

            <UploadDropZone
              accept=".pdf,.txt,.md,.doc,.docx"
              buttonLabel={resumeSourceName ? "重新上传当前简历" : "上传简历"}
              title={resumeSourceName ? "替换当前简历文件" : "点击选择简历，或直接拖拽到这里"}
              description="推荐上传 PDF 或 DOCX。上传记录也支持网页预览，不需要每次都先下载。"
              disabled={loading}
              onFilesSelected={onUploadResumeFile}
            />

            {resumeSourceName && (
              <p className="mt-3 text-xs text-[var(--muted)]">当前文件：{resumeSourceName}</p>
            )}

            <div className="mt-4">
              <TextArea
                value={resumeSourceText}
                onChange={onResumeSourceChange}
                rows={14}
                placeholder="把你现有的简历正文粘贴到这里，或者先上传 PDF / TXT / MD / DOC / DOCX。"
              />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
