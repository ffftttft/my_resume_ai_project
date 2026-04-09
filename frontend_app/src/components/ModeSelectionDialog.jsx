import React from "react";

const MODE_OPTIONS = [
  {
    value: "greenfield",
    label: "新建简历",
    description: "录入目标岗位与候选人资料，生成初版简历后再继续补充与优化。",
    tag: "适合首次整理资料",
    index: "01",
  },
  {
    value: "existing_resume",
    label: "现有简历优化",
    description: "上传现有简历后，围绕目标岗位要求进行定向优化与重写。",
    tag: "适合已有内容优化",
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
        aria-describedby="mode-selection-description"
        className="paper-panel-strong float-card mode-dialog-shell"
      >
        <div className="mode-dialog-shell__header">
          <div>
            <p className="mode-dialog-shell__eyebrow">工作模式</p>
            <p className="mode-dialog-shell__user">欢迎回来，{username}</p>
            <h2 id="mode-selection-title" className="mode-dialog-shell__title">
              选择工作模式
            </h2>
            <p id="mode-selection-description" className="mode-dialog-shell__description">
              进入后仍可在页面顶部切换模式。
            </p>
          </div>

          <span className="chip accent-chip">首次进入需选择</span>
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
                      {selected ? "当前模式" : option.tag}
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
