import React from "react";

import ResumePreview from "./ResumePreview";

export default function ExistingResumePreview({
  title,
  resumeText,
  onResumeChange,
  onSaveManualEdit,
  onClearResume,
  onExport,
  generationMode,
  analysisNotes,
  structuredResume,
  contractReport,
  streamingDraftText,
  streamingStatus,
  isStreaming,
  loading,
  revisionInstruction,
  onRevisionInstructionChange,
  onReviseWithAI,
}) {
  const hasResume = Boolean(resumeText.trim());
  const resumeLength = resumeText.trim().length;
  const displayTitle = title || "等待优化结果";
  const description = hasResume
    ? "这里展示按目标岗位优化后的版本。你可以继续人工修订、保存版本，或交由 AI 继续润色。"
    : "请先进入资料录入页，填写岗位信息并上传现有简历后再执行优化。";
  const stageCaption = hasResume
    ? "优化后的简历正文会展示在这里，方便继续人工调整。"
    : "完成资料录入并执行优化后，结果会自动显示在这里。";

  return (
    <section className="paper-panel preview-shell preview-shell--optimize p-6 lg:p-7">
      <div className="preview-shell__masthead">
        <div className="preview-shell__intro">
          <p className="preview-shell__eyebrow">简历优化</p>
          <h2 className="preview-shell__title">{displayTitle}</h2>
          <p className="preview-shell__description">{description}</p>
        </div>

        <div className="preview-toolbar">
          <button
            type="button"
            onClick={onSaveManualEdit}
            disabled={!hasResume || loading}
            className="preview-toolbar__button"
          >
            保存版本
          </button>
          <button
            type="button"
            onClick={onClearResume}
            disabled={!resumeText.trim() && !title.trim()}
            className="preview-toolbar__button"
          >
            清空结果
          </button>
          <button
            type="button"
            onClick={() => onExport("md")}
            disabled={!hasResume || loading}
            className="preview-toolbar__button preview-toolbar__button--primary"
          >
            导出 Markdown
          </button>
          <button
            type="button"
            onClick={() => onExport("txt")}
            disabled={!hasResume || loading}
            className="preview-toolbar__button"
          >
            导出 TXT
          </button>
        </div>
      </div>

      <div className="my-6 section-divider" />

      <section className="preview-stage">
        <div className="preview-stage__header">
          <div>
            <p className="preview-stage__label">结果预览</p>
            <p className="preview-stage__caption">{stageCaption}</p>
          </div>

          <div className="preview-stage__chips">
            <span className="chip">{["openai", "deepseek"].includes(generationMode) ? "AI 优化" : "本地兜底"}</span>
            <span className={`chip ${hasResume ? "accent-chip" : ""}`}>
              {hasResume ? "已生成结果" : "空白工作区"}
            </span>
          </div>
        </div>

        <div className="preview-stage__workspace">
          <ResumePreview
            structuredResume={structuredResume}
            draftText={streamingDraftText}
            isStreaming={isStreaming}
            streamStatus={streamingStatus}
            generationMode={generationMode}
          />

          <div className="preview-stage__surface preview-stage__surface--editor">
            <div className="preview-stage__editor-head">
              <div>
                <p className="preview-stage__label">实时正文</p>
                <p className="preview-stage__caption">
                  {isStreaming
                    ? "优化结果会随着流式返回逐字写入这块正文，你可以直接看到模型的落版过程。"
                    : "优化后的正文会先沉淀在这里，后续可继续人工修改、二次修订和导出。"}
                </p>
              </div>

              <div className="preview-stage__chips">
                <span className={`chip ${isStreaming ? "accent-chip" : ""}`}>
                  {isStreaming ? "逐字写入中" : hasResume ? "可人工编辑" : "等待正文"}
                </span>
                <span className="chip">{resumeLength > 0 ? `${resumeLength} 个字符` : "尚无正文"}</span>
              </div>
            </div>

            <textarea
              value={resumeText}
              onChange={(event) => onResumeChange(event.target.value)}
              readOnly={isStreaming}
              rows={24}
              className="field-shell resume-text resume-editor-font preview-stage__editor w-full resize-y px-4 py-4 outline-none"
              placeholder={isStreaming ? "正在实时写入简历正文..." : "优化后的简历内容会直接显示在这里。"}
            />
          </div>
        </div>
      </section>

      <section className="preview-meta-grid">
        <div className="preview-note-card">
          <p className="preview-note-card__label">优化说明</p>
          {analysisNotes?.length > 0 ? (
            <ul className="preview-note-card__list">
              {analysisNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="preview-note-card__text">优化完成后，这里会展示本次结果的处理说明。</p>
          )}
        </div>

        <div className="preview-note-card preview-note-card--accent">
          <div className="mb-3">
            <p className="preview-note-card__label">AI 二次优化</p>
            <p className="preview-note-card__text">
              可以继续指定你希望 AI 调整的方向，例如更贴近 JD、强调亮点或压缩冗余表达。
            </p>
          </div>
          <textarea
            value={revisionInstruction}
            onChange={(event) => onRevisionInstructionChange(event.target.value)}
            rows={5}
            className="field-shell w-full resize-y px-4 py-4 outline-none"
            placeholder="例如：继续强化与目标岗位直接相关的技能，并减少背景描述。"
          />
          <button
            type="button"
            onClick={onReviseWithAI}
            disabled={loading || !hasResume}
            className="preview-note-card__action"
          >
            {loading ? "发送中..." : "发送给 AI"}
          </button>
        </div>
      </section>
    </section>
  );
}
