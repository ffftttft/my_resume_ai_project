import React from "react";

const MODE_OPTIONS = [
  {
    value: "greenfield",
    label: "没有简历，直接生成",
    description: "从头填写个人信息，系统先出初稿，再只追问一轮最多 3 个关键问题。",
    tag: "适合首次整理简历",
  },
  {
    value: "existing_resume",
    label: "已有简历，按岗位优化",
    description: "上传现有简历后，围绕目标公司、岗位名称和招聘要求定向优化。",
    tag: "适合已有内容重写",
  },
];

export default function ModeSelectionDialog({ open, activeBoard, onSelect }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,49,59,0.42)] p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-selection-title"
        className="paper-panel-strong float-card w-full max-w-3xl p-6 lg:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-[var(--accent)] uppercase">
              Choose Mode
            </p>
            <h2 id="mode-selection-title" className="mt-2 text-3xl font-semibold text-[var(--ink)]">
              选择本次使用模式
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
              进入后仍可在页面顶部切换。两种模式都要求填写公司、岗位名称和招聘要求；如果暂时没有明确目标，也可以直接使用通用选项。
            </p>
          </div>

          <span className="chip accent-chip">首次打开必选</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {MODE_OPTIONS.map((option) => {
            const selected = activeBoard === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-slate-200 bg-white/78 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--ink)]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.description}</p>
                  </div>
                  <span className={`chip ${selected ? "accent-chip" : ""}`}>
                    {selected ? "当前默认模式" : option.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
