import React from "react";
import { Braces, ChevronDown, Download, Image, Square, Trash2, Wand2 } from "lucide-react";

function MetaChip({ children, tone = "neutral" }) {
  return <span className={`draft-lab-panel__meta-chip draft-lab-panel__meta-chip--${tone}`}>{children}</span>;
}

function parseResumeModules(resumeText) {
  const text = typeof resumeText === "string" ? resumeText : "";
  if (!text.trim()) return [];

  const matches = Array.from(text.matchAll(/^##\s+(.+)$/gm));
  if (matches.length === 0) {
    return [{ type: "full", title: "简历正文", heading: "", content: text }];
  }

  const modules = [];
  const preamble = text.slice(0, matches[0].index).trim();
  if (preamble) {
    modules.push({ type: "preamble", title: "标题信息", heading: "", content: preamble });
  }

  matches.forEach((match, index) => {
    const headingStart = match.index || 0;
    const headingEnd = headingStart + match[0].length;
    const nextStart = index + 1 < matches.length ? matches[index + 1].index || text.length : text.length;
    modules.push({
      type: "section",
      title: match[1].trim() || "简历模块",
      heading: match[0].trim(),
      content: text.slice(headingEnd, nextStart).trim(),
    });
  });

  return modules;
}

function serializeResumeModules(modules) {
  return modules
    .map((module) => {
      if (module.type === "section") {
        return [module.heading, module.content].filter((part) => part && part.trim()).join("\n");
      }
      return module.content || "";
    })
    .filter((part) => part.trim())
    .join("\n\n");
}

function getModuleTextareaRows(content) {
  const lineCount = String(content || "").split("\n").length;
  return Math.min(12, Math.max(4, lineCount + 1));
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
  onOpenResumeImagePage,
}) {
  const normalizedResumeText = typeof resumeText === "string" ? resumeText : "";
  const normalizedInstruction = typeof revisionInstruction === "string" ? revisionInstruction : "";
  const resumeModules = parseResumeModules(normalizedResumeText);
  const shouldUseSectionEditor = resumeModules.length > 1;
  const hasResumeText = Boolean(normalizedResumeText.trim());
  const titleText = title?.trim() || `${boardLabel}草稿实验台`;
  const statusLabel = isStreaming
    ? "流式写入中"
    : ["openai", "deepseek"].includes(generationMode)
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
            {streamStatus || "右侧主工作区保留改写指令、正文编辑、保存与导出。"}
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

      {warning ? <p className="draft-lab-panel__warning">{warning}</p> : null}

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
          {shouldUseSectionEditor ? (
            <div className="draft-lab-panel__section-editor-list custom-scrollbar">
              {resumeModules.map((module, index) => (
                <section key={`${module.title}-${index}`} className="draft-lab-panel__section-editor">
                  <div className="draft-lab-panel__section-head">
                    <span className="draft-lab-panel__section-title">{module.title}</span>
                    <span className="draft-lab-panel__section-index">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <textarea
                    value={module.content}
                    readOnly={isStreaming}
                    onChange={(event) => {
                      const nextModules = resumeModules.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, content: event.target.value } : item,
                      );
                      onResumeChange(serializeResumeModules(nextModules));
                    }}
                    rows={getModuleTextareaRows(module.content)}
                    className="draft-lab-panel__textarea draft-lab-panel__textarea--module"
                    placeholder={isStreaming ? "正在流式写入内容..." : `${module.title}内容会显示在这里。`}
                  />
                </section>
              ))}
            </div>
          ) : (
            <textarea
              value={normalizedResumeText}
              readOnly={isStreaming}
              onChange={(event) => onResumeChange(event.target.value)}
              rows={18}
              className="draft-lab-panel__textarea draft-lab-panel__textarea--editor"
              placeholder={isStreaming ? "正在流式写入内容..." : "这里会显示当前简历草稿。"}
            />
          )}
        </label>
      </div>

      <div className="draft-lab-panel__footer">
        {typeof onOpenResumeImagePage === "function" ? (
          <button
            type="button"
            onClick={onOpenResumeImagePage}
            disabled={!hasResumeText || loading}
            className="draft-lab-panel__image-action"
          >
            <span className="draft-lab-panel__image-action-icon">
              <Image size={18} />
            </span>
            <span className="draft-lab-panel__image-action-copy">
              <strong>生成文件</strong>
              <small>进入模板库生成简历文件</small>
            </span>
          </button>
        ) : null}

        <div className="draft-lab-panel__compact-actions">
          <details className={`draft-lab-panel__export-menu ${!hasResumeText || loading ? "is-disabled" : ""}`}>
            <summary
              className="draft-lab-panel__secondary-action"
              onClick={(event) => {
                if (!hasResumeText || loading) {
                  event.preventDefault();
                }
              }}
            >
              <Download size={15} />
              导出
              <ChevronDown size={14} />
            </summary>
            <div className="draft-lab-panel__export-options">
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  onExport("md");
                }}
                disabled={!hasResumeText || loading}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  onExport("txt");
                }}
                disabled={!hasResumeText || loading}
              >
                TXT
              </button>
            </div>
          </details>

          <button type="button" onClick={onClearResume} disabled={!hasResumeText} className="draft-lab-panel__secondary-action">
            <Trash2 size={15} />
            清空
          </button>

          <button type="button" onClick={onOpenJsonModal} className="draft-lab-panel__secondary-action">
            <Braces size={15} />
            JSON
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
