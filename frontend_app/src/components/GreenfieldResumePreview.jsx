import React from "react";

import ResumePreview from "./ResumePreview";

export default function GreenfieldResumePreview({
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
  const displayTitle = title || "等待生成结果";
  const description = hasResume
    ? "这里展示新建简历的当前版本。你可以继续人工修订、保存版本，或追加 AI 优化指令。"
    : "请先进入资料录入页，完善目标岗位与候选人资料后再执行生成。";
  const stageCaption = hasResume
    ? "生成后的简历正文会展示在这里，支持直接人工编辑。"
    : "完成资料录入并执行生成后，结果会自动显示在这里。";

  return (
    <section className="paper-panel preview-shell preview-shell--greenfield p-6 lg:p-7">
      <div className="preview-shell__masthead">
        <div className="preview-shell__intro">
          <p className="preview-shell__eyebrow">新建简历</p>
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
            <span className="chip">{["openai", "deepseek"].includes(generationMode) ? "AI 生成" : "本地兜底"}</span>
            <span className={`chip ${hasResume ? "accent-chip" : ""}`}>
              {hasResume ? "已生成内容" : "空白工作区"}
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
                    ? "右侧正文会随着模型返回的结果逐字写入，你可以直接看见它不是一次性刷出完整内容。"
                    : "结构化结果会先落进这块正文区，后续可继续人工编辑和导出。"}
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
              placeholder={isStreaming ? "正在实时写入简历正文..." : "生成后的简历内容会直接显示在这里。"}
            />
          </div>
        </div>
      </section>

      <section className="preview-meta-grid">
        <div className="preview-note-card">
          <p className="preview-note-card__label">生成说明</p>
          {analysisNotes?.length > 0 ? (
            <ul className="preview-note-card__list">
              {analysisNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="preview-note-card__text">生成完成后，这里会展示本次草稿的处理说明。</p>
          )}
        </div>

        <div className="preview-note-card preview-note-card--accent">
          <div className="mb-3">
            <p className="preview-note-card__label">AI 修订指令</p>
            <p className="preview-note-card__text">
              继续告诉 AI 你要强化什么，例如更贴近岗位、突出量化结果，或压缩表达。
            </p>
          </div>
          <textarea
            value={revisionInstruction}
            onChange={(event) => onRevisionInstructionChange(event.target.value)}
            rows={5}
            className="field-shell w-full resize-y px-4 py-4 outline-none"
            placeholder="例如：突出项目成果中的量化指标，并让表述更贴近岗位要求。"
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
