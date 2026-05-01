import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Image,
  Loader2,
  Maximize2,
  Save,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const IMAGE_MODELS = [
  { value: "gpt-image-2", label: "Image2", meta: "1K A4" },
  { value: "gpt-image-2pro", label: "Image2 Pro", meta: "2K A4" },
];

const FILE_PROGRESS_STEPS = [
  "整理事实",
  "选择入版内容",
  "填充 DOCX 模板",
  "本地版式审查",
  "渲染图片预览",
  "生成完成",
];

function ReportList({ title, items = [], tone = "neutral" }) {
  const visibleItems = items.filter(Boolean).slice(0, 5);
  if (visibleItems.length === 0) return null;
  return (
    <div className={`resume-file-page__report-block is-${tone}`}>
      <p>{title}</p>
      <ul>
        {visibleItems.map((item) => (
          <li key={typeof item === "string" ? item : JSON.stringify(item)}>
            {typeof item === "string" ? item : item.title || item.label || JSON.stringify(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResumeImagePanel({
  boardLabel,
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  model,
  onModelChange,
  avatar,
  imageState,
  hasResumeText,
  resumeTextLength = 0,
  loading,
  imageTestLoading,
  savingImage,
  savingWord,
  onGenerate,
  onGenerateImageTest,
  onSaveImage,
  onSaveWord,
  onBack,
}) {
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || templates[0] || null,
    [selectedTemplateId, templates],
  );
  const result = imageState?.result;
  const wordResult = imageState?.word_result;
  const imageTestResult = imageState?.image_test_result;
  const layoutReport = result?.layout_report || {};
  const previewReport = layoutReport.preview || {};
  const isGenerating = imageState?.status === "generating" || loading;
  const isImageTesting = imageState?.image_test_status === "generating" || imageTestLoading;
  const isSaving = savingImage || savingWord;
  const [lightboxImage, setLightboxImage] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(result ? FILE_PROGRESS_STEPS.length - 1 : 0);
      return undefined;
    }
    setProgressIndex(0);
    const timer = window.setInterval(() => {
      setProgressIndex((previous) => Math.min(previous + 1, FILE_PROGRESS_STEPS.length - 2));
    }, 520);
    return () => window.clearInterval(timer);
  }, [isGenerating, result?.file_name]);

  useEffect(() => {
    if (!lightboxImage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImage]);

  const generatedPreview = result?.preview_url
    ? {
        src: result.preview_url,
        alt: "生成的 Word 图片预览",
        label: "Word 预览",
        meta: `${result.template_name || "DOCX 模板"} · ${result.file_name || "Word 已生成"}`,
      }
    : null;

  const templatePreview = selectedTemplate?.preview_url
    ? {
        src: selectedTemplate.preview_url,
        alt: selectedTemplate.name,
        label: "模板预览",
        meta: selectedTemplate.description || "点击模板卡片可放大查看。",
      }
    : null;

  const mainPreview = generatedPreview || templatePreview;
  const fixedIssues = layoutReport.fixed_issues || [];
  const warnings = layoutReport.warnings || [];
  const overflowNotes = layoutReport.overflow_notes || [];
  const selectedRecords = layoutReport.selected_records || [];
  const omittedRecords = layoutReport.omitted_records || [];

  return (
    <main className="resume-image-page resume-file-page">
      <header className="resume-image-page__header">
        <div className="min-w-0">
          <p className="resume-image-page__eyebrow">{boardLabel} · Resume Files</p>
          <h2 className="resume-image-page__title">简历文件生成</h2>
          <p className="resume-image-page__copy">
            主流程使用 DOCX 模板替换内容，优先保证中文清晰、事实准确和版式稳定。图片仅作为浏览器预览。
          </p>
        </div>

        <button type="button" onClick={onBack} className="resume-image-page__back">
          <ArrowLeft size={16} />
          返回工作台
        </button>
      </header>

      <section className="resume-file-page__layout">
        <div className="resume-image-page__panel resume-file-page__templates">
          <div className="resume-image-page__panel-head">
            <div>
              <p className="resume-image-page__section-kicker">Template Library</p>
              <h3>选择 DOCX 模板</h3>
            </div>
            <span>{templates.length || 0} 个模板</span>
          </div>

          <div className="resume-image-page__template-grid custom-scrollbar">
            {templates.length > 0 ? (
              templates.map((template) => {
                const isSelected = template.id === selectedTemplate?.id;
                return (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template.id);
                      if (template.preview_url) {
                        setLightboxImage({
                          src: template.preview_url,
                          alt: template.name,
                          label: "模板预览",
                        });
                      }
                    }}
                    className={`resume-image-page__template ${isSelected ? "is-selected" : ""}`}
                  >
                    <span className="resume-image-page__template-thumb">
                      <img src={template.preview_url} alt={template.name} />
                    </span>
                    <span className="resume-image-page__template-body">
                      <strong>{template.name}</strong>
                      <small>{(template.style_tags || []).slice(0, 4).join(" / ") || template.category}</small>
                    </span>
                    <span className="resume-image-page__template-view">
                      {isSelected ? <CheckCircle2 size={14} /> : <Eye size={14} />}
                      {isSelected ? "已选择" : "查看"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="resume-image-page__empty">
                <Image size={30} />
                <p>模板库暂未加载</p>
              </div>
            )}
          </div>

          <div className="resume-file-page__readiness">
            <div>
              <FileText size={16} />
              <span>{hasResumeText ? `${resumeTextLength} 字符正文` : "缺少简历正文"}</span>
            </div>
            <div>
              <UserRound size={16} />
              <span>{avatar?.preview_url ? "头像将替换模板照片" : "头像可选"}</span>
            </div>
          </div>

          {imageState?.error ? <p className="resume-image-page__error">{imageState.error}</p> : null}

          <button
            type="button"
            onClick={onGenerate}
            disabled={!hasResumeText || isGenerating || templates.length === 0}
            className="resume-image-page__generate"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? "生成中..." : "生成简历文件"}
          </button>
        </div>

        <div className="resume-image-page__panel resume-image-page__panel--preview resume-file-page__preview">
          <div className="resume-image-page__panel-head">
            <div>
              <p className="resume-image-page__section-kicker">Preview</p>
              <h3>{generatedPreview ? "生成结果预览" : "模板预览"}</h3>
            </div>
            {generatedPreview ? (
              <button
                type="button"
                className="resume-file-page__ghost-action"
                onClick={() => setLightboxImage(generatedPreview)}
              >
                <Maximize2 size={15} />
                放大查看
              </button>
            ) : null}
          </div>

          {isGenerating ? (
            <div className="resume-file-page__progress">
              <div className="resume-file-page__progress-orbit">
                <Sparkles size={28} />
              </div>
              <div className="resume-file-page__progress-steps">
                {FILE_PROGRESS_STEPS.map((step, index) => (
                  <span
                    key={step}
                    className={
                      index < progressIndex
                        ? "is-done"
                        : index === progressIndex
                          ? "is-active"
                          : ""
                    }
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="resume-image-page__a4-stage resume-file-page__a4-stage">
              {mainPreview?.src ? (
                <button
                  type="button"
                  className="resume-image-page__a4-frame resume-image-page__a4-frame--clickable"
                  onClick={() => setLightboxImage(mainPreview)}
                  title="点击放大查看"
                >
                  <img src={mainPreview.src} alt={mainPreview.alt} />
                  <span className="resume-image-page__zoom-hint">
                    <Maximize2 size={14} />
                    放大查看
                  </span>
                </button>
              ) : result ? (
                <div className="resume-image-page__a4-frame resume-file-page__preview-missing">
                  <FileText size={36} />
                  <p>Word 已生成，但当前环境没有生成图片预览。</p>
                  <span>{previewReport.message || "可先保存 Word；配置 Word 或 LibreOffice 后会显示预览图。"}</span>
                </div>
              ) : (
                <div className="resume-image-page__a4-frame">
                  <div className="resume-image-page__a4-placeholder">
                    <Image size={34} />
                    <p>选择模板后在这里查看 A4 预览</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="resume-image-page__preview-meta">
            {generatedPreview?.meta || templatePreview?.meta || "生成后这里会显示 Word 文件渲染出的高清图片。"}
          </p>
        </div>

        <aside className="resume-image-page__panel resume-file-page__actions">
          <div className="resume-image-page__panel-head">
            <div>
              <p className="resume-image-page__section-kicker">Output</p>
              <h3>文件操作</h3>
            </div>
            <span>{result?.saved_name ? "已生成" : "待生成"}</span>
          </div>

          <div className="resume-file-page__save-card">
            <p>{result?.saved_name ? "DOCX 模板结果已就绪" : "先生成 Word 和预览图"}</p>
            <span>
              {wordResult?.saved_name
                ? `Word：${wordResult.file_name || wordResult.saved_name}`
                : "生成后可保存 Word；如果本机渲染器可用，也可保存图片预览。"}
            </span>
          </div>

          <div className="resume-image-page__save-actions resume-file-page__save-actions">
            <button type="button" onClick={onSaveWord} disabled={!result?.saved_name || isSaving}>
              {savingWord ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {savingWord ? "保存中..." : "保存 Word"}
            </button>
            <button type="button" onClick={onSaveImage} disabled={!result?.preview_url || isSaving}>
              {savingImage ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingImage ? "保存中..." : "保存图片预览"}
            </button>
          </div>

          <div className="resume-file-page__report">
            <div className="resume-file-page__report-head">
              <p>版式检查</p>
              <span className={warnings.length > 0 ? "is-warning" : "is-ok"}>
                {warnings.length > 0 ? "需检查" : result ? "通过" : "待生成"}
              </span>
            </div>
            <ReportList title="已处理" items={fixedIssues} tone="ok" />
            <ReportList title="需要注意" items={warnings} tone="warning" />
            <ReportList title="容量提示" items={overflowNotes} />
            <ReportList title="已入版内容" items={selectedRecords} />
            <ReportList title="未入版内容" items={omittedRecords} tone="muted" />
            {previewReport.message ? <p className="resume-file-page__preview-note">{previewReport.message}</p> : null}
          </div>

          <details className="resume-file-page__test-box">
            <summary>
              <AlertTriangle size={16} />
              AI 生图测试
            </summary>
            <p>
              测试功能：当前 OpenAI 系列生图模型对中文密集文本支持仍不稳定，可能出现模糊、错字或错排版，生成结果仅供视觉参考，不建议直接投递。
            </p>

            <div className="resume-image-page__model-tabs" role="tablist" aria-label="图片模型">
              {IMAGE_MODELS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onModelChange(item.value)}
                  className={model === item.value ? "is-active" : ""}
                >
                  <span>{item.label}</span>
                  <small>{item.meta}</small>
                </button>
              ))}
            </div>

            {imageState?.image_test_error ? (
              <p className="resume-image-page__error">{imageState.image_test_error}</p>
            ) : null}

            {imageTestResult?.preview_url ? (
              <button
                type="button"
                className="resume-file-page__test-preview"
                onClick={() =>
                  setLightboxImage({
                    src: imageTestResult.preview_url,
                    alt: "AI 生图测试结果",
                    label: "AI 生图测试",
                  })
                }
              >
                <Image size={16} />
                查看测试结果
              </button>
            ) : null}

            <button
              type="button"
              onClick={onGenerateImageTest}
              disabled={!hasResumeText || isImageTesting || templates.length === 0}
              className="resume-file-page__test-action"
            >
              {isImageTesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isImageTesting ? "测试生成中..." : "运行 AI 生图测试"}
            </button>
          </details>
        </aside>
      </section>

      {lightboxImage ? (
        <div className="resume-image-lightbox" role="dialog" aria-modal="true" onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className="resume-image-lightbox__close"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxImage(null);
            }}
            aria-label="关闭大图预览"
          >
            <X size={18} />
          </button>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </main>
  );
}
