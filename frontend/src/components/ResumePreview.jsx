// Shared resume editor workspace used by both workflow boards.
import React from "react";

export default function ResumePreview({
  title,
  resumeText,
  onResumeChange,
  onSaveManualEdit,
  onClearResume,
  onExport,
  generationMode,
  analysisNotes,
  loading,
  revisionInstruction,
  onRevisionInstructionChange,
  onReviseWithAI,
}) {
  return (
    <section className="paper-panel p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.3em] text-[var(--accent)] uppercase">
            Resume Workspace
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">
            {title || "等待生成简历"}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip accent-chip">
              {["openai", "deepseek"].includes(generationMode) ? "AI模式" : "本地兜底模式"}
            </span>
            <span className="chip">{resumeText ? "当前简历可直接编辑" : "尚未生成内容"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSaveManualEdit}
            disabled={!resumeText.trim() || loading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            保存快照
          </button>
          <button
            type="button"
            onClick={onClearResume}
            disabled={!resumeText.trim() && !title.trim()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            清空简历
          </button>
          <button
            type="button"
            onClick={() => onExport("md")}
            disabled={!resumeText.trim() || loading}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            导出 Markdown
          </button>
          <button
            type="button"
            onClick={() => onExport("txt")}
            disabled={!resumeText.trim() || loading}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            导出 TXT
          </button>
        </div>
      </div>

      <div className="my-6 section-divider" />

      <div className="space-y-5">
        <div className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-[0.24em] text-[var(--muted)] uppercase">
              简历内容
            </p>
            <span className="text-xs text-[var(--muted)]">这里就是最终可编辑内容</span>
          </div>
          <textarea
            value={resumeText}
            onChange={(event) => onResumeChange(event.target.value)}
            rows={24}
            className="field-shell resume-text resume-editor-font w-full resize-y px-4 py-4 outline-none"
            placeholder="生成后的简历会直接出现在这里，你可以继续编辑、保存或导出。"
          />
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
          <div className="mb-3">
            <p className="text-sm font-semibold tracking-[0.24em] text-[var(--muted)] uppercase">
              AI 修正指令
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              这里写你想让 AI 继续优化的方向，例如更贴岗位、更强调成果或更精简表达。
            </p>
          </div>

          <div className="relative">
            <textarea
              value={revisionInstruction}
              onChange={(event) => onRevisionInstructionChange(event.target.value)}
              rows={5}
              className="field-shell w-full resize-y px-4 py-4 pb-16 outline-none"
              placeholder="例如：更突出后端工程化、性能优化结果，并按招聘要求重排重点。"
            />
            <button
              type="button"
              onClick={onReviseWithAI}
              disabled={loading || !resumeText.trim()}
              className="absolute bottom-4 right-4 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "发送中..." : "发送给AI"}
            </button>
          </div>
        </div>
      </div>

      {analysisNotes?.length > 0 && (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/70 p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">生成说明</p>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            {analysisNotes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
