// Modal card for AI-generated clarification questions triggered after resume generation.
import React from "react";

export default function QuestionCard({
  open,
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  onSkip,
  onClose,
  loading,
  title = "生成时发现这些信息还不够具体",
  description = "回答后会再次生成简历，并把你的补充信息整合进去。",
  placeholder = "请输入这段经历更具体的职责、动作、结果或数据...",
}) {
  // Example props:
  // <QuestionCard open questions={["项目里你负责哪部分？"]} answers={{}} onAnswerChange={...} />
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm">
      <div className="paper-panel-strong float-card w-full max-w-3xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
              AI Follow-up
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          >
            关闭
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question} className="rounded-3xl border border-slate-200 bg-white/70 p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--ink)]">
                Q{index + 1}. {question}
              </p>
              <textarea
                value={answers[question] || ""}
                onChange={(event) => onAnswerChange(question, event.target.value)}
                rows={3}
                className="field-shell w-full resize-y px-4 py-3 outline-none"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
          >
            稍后处理
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            跳过补充，直接使用当前草稿
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "更新中..." : "提交并重新生成"}
          </button>
        </div>
      </div>
    </div>
  );
}
