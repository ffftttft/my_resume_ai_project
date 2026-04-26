import React from "react";
import { Braces, Download, RotateCcw, Save, Square, Trash2, Wand2 } from "lucide-react";

function MetaChip({ children, tone = "neutral" }) {
  return (
    <span className={`draft-lab-panel__meta-chip draft-lab-panel__meta-chip--${tone}`}>
      {children}
    </span>
  );
}

export default function DraftLabPanel({
  boardLabel,
  title,
  resumeText,
  onResumeChange,
  generationMode,
  isStreaming,
  streamStatus,
  loading,
  onSaveManualEdit,
  onClearResume,
  onExport,
  revisionInstruction,
  onRevisionInstructionChange,
  onReviseWithAI,
  onOpenJsonModal,
  onAbortStream,
  analysisCount = 0,
  warning = "",
  onSaveWorkspace,
  onRestoreWorkspaceBackup,
  draftSaving = false,
  hasSavedBackup = false,
}) {
  const normalizedResumeText = typeof resumeText === "string" ? resumeText : "";
  const normalizedInstruction = typeof revisionInstruction === "string" ? revisionInstruction : "";
  const hasResumeText = Boolean(normalizedResumeText.trim());
  const titleText = title?.trim() || `${boardLabel}草稿实验台`;
  const statusLabel = isStreaming
    ? "流式写入中"
    : generationMode === "openai"
      ? "AI 已生成"
      : hasResumeText
        ? "可继续编辑"
        : "等待草稿";

  return (
    <article className="atelier-panel draft-lab-panel flex min-h-[40rem] flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:flex-1">
      <div className="draft-lab-panel__header">
        <div className="min-w-0">
          <p className="draft-lab-panel__eyebrow">草稿实验台</p>
          <h3 className="draft-lab-panel__title" title={titleText}>
            {titleText}
          </h3>
          <p className="draft-lab-panel__copy" title={streamStatus || ""}>
            {streamStatus || "右侧主工作区只保留改写指令、正文编辑、保存与导出。"}
          </p>
        </div>

        <button
          type="button"
          onClick={onReviseWithAI}
          disabled={loading || !hasResumeText}
          className="draft-lab-panel__primary-action"
        >
          <Wand2 size={15} />
          AI 改写
        </button>
      </div>

      <div className="draft-lab-panel__meta-row">
        <MetaChip tone={isStreaming ? "accent" : "neutral"}>{statusLabel}</MetaChip>
        <MetaChip>{hasResumeText ? `${normalizedResumeText.trim().length} 字符` : "暂无草稿"}</MetaChip>
        <MetaChip>{analysisCount > 0 ? `${analysisCount} 条说明` : "等待说明"}</MetaChip>
      </div>

      <div className="draft-lab-panel__body">
        <label className="draft-lab-panel__field">
          <span className="draft-lab-panel__field-label">改写指令</span>
          <textarea
            value={normalizedInstruction}
            onChange={(event) => onRevisionInstructionChange(event.target.value)}
            rows={4}
            className="draft-lab-panel__textarea draft-lab-panel__textarea--instruction"
            placeholder="说明下一轮 AI 需要重点强化什么。"
          />
        </label>

        <label className="draft-lab-panel__field draft-lab-panel__field--grow">
          <span className="draft-lab-panel__field-label">简历正文</span>
          <textarea
            value={normalizedResumeText}
            readOnly={isStreaming}
            onChange={(event) => onResumeChange(event.target.value)}
            rows={18}
            className="draft-lab-panel__textarea draft-lab-panel__textarea--editor"
            placeholder={isStreaming ? "正在流式写入内容..." : "这里会显示当前简历草稿。"}
          />
        </label>
      </div>

      <div className="draft-lab-panel__footer">
        <div className="draft-lab-panel__action-row">
          {typeof onSaveWorkspace === "function" ? (
            <button
              type="button"
              onClick={onSaveWorkspace}
              disabled={draftSaving}
              className="draft-lab-panel__secondary-action"
            >
              <Save size={15} />
              {draftSaving ? "保存中..." : "保存草稿"}
            </button>
          ) : null}
          {typeof onRestoreWorkspaceBackup === "function" ? (
            <button
              type="button"
              onClick={onRestoreWorkspaceBackup}
              disabled={!hasSavedBackup}
              className="draft-lab-panel__secondary-action"
            >
              <RotateCcw size={15} />
              恢复备份
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSaveManualEdit}
            disabled={!hasResumeText || loading}
            className="draft-lab-panel__secondary-action"
          >
            <Save size={15} />
            保存快照
          </button>
          <button
            type="button"
            onClick={() => onExport("md")}
            disabled={!hasResumeText || loading}
            className="draft-lab-panel__secondary-action"
          >
            <Download size={15} />
            导出 MD
          </button>
          <button
            type="button"
            onClick={() => onExport("txt")}
            disabled={!hasResumeText || loading}
            className="draft-lab-panel__secondary-action"
          >
            <Download size={15} />
            导出 TXT
          </button>
          <button
            type="button"
            onClick={onClearResume}
            disabled={!hasResumeText}
            className="draft-lab-panel__secondary-action"
          >
            <Trash2 size={15} />
            清空草稿
          </button>
        </div>

        <div className="draft-lab-panel__action-row">
          <button
            type="button"
            onClick={onOpenJsonModal}
            className="draft-lab-panel__secondary-action"
          >
            <Braces size={15} />
            查看实时 JSON
          </button>
          {isStreaming ? (
            <button
              type="button"
              onClick={onAbortStream}
              className="draft-lab-panel__secondary-action draft-lab-panel__secondary-action--danger"
            >
              <Square size={15} />
              停止生成
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
