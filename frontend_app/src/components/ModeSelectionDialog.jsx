import React from "react";

const MODE_OPTIONS = [
  {
    value: "greenfield",
    label: "新建简历",
    description: "从岗位和候选素材出发生成新稿。",
    tag: "从零开始",
    index: "01",
  },
  {
    value: "existing_resume",
    label: "优化简历",
    description: "基于现有简历做定向重写和补强。",
    tag: "已有内容",
    index: "02",
  },
];

export default function ModeSelectionDialog({ open, activeBoard, onSelect, username = "ft" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-shell">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-selection-title"
        className="paper-panel-strong float-card mode-dialog-shell"
      >
        <div className="mode-dialog-shell__header">
          <div>
            <p className="mode-dialog-shell__eyebrow">工作模式</p>
            <p className="mode-dialog-shell__user">欢迎回来，{username}</p>
            <h2 id="mode-selection-title" className="mode-dialog-shell__title">
              选择工作方式
            </h2>
          </div>

          <span className="chip accent-chip">可随时切换</span>
        </div>

        <div className="mode-dialog-shell__grid">
          {MODE_OPTIONS.map((option) => {
            const selected = activeBoard === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`mode-option ${selected ? "is-selected" : ""}`}
              >
                <div className="mode-option__index">{option.index}</div>
                <div className="mode-option__body">
                  <div className="mode-option__topline">
                    <p className="mode-option__label">{option.label}</p>
                    <span className={`chip ${selected ? "accent-chip" : ""}`}>
                      {selected ? "当前" : option.tag}
                    </span>
                  </div>
                  <p className="mode-option__description">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
