import React from "react";
import { CheckCircle2, FileText } from "lucide-react";

export default function ResumeTemplateSelector({
  id,
  title = "简历文件模板",
  subtitle = "先选择模板，系统会按模板容量组织正文并生成 Word 与图片预览。",
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
}) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;

  return (
    <section id={id} className="paper-panel form-section-card resume-template-selector p-6">
      <div className="form-section-card__head">
        <div>
          <h3 className="form-section-card__title">{title}</h3>
          <p className="form-section-card__subtitle">{subtitle}</p>
        </div>
        <span className="chip">{selectedTemplate?.name || "未选择"}</span>
      </div>

      <div className="resume-template-selector__grid">
        {templates.length > 0 ? (
          templates.map((template) => {
            const selected = template.id === selectedTemplate?.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate(template.id)}
                className={`resume-template-selector__item ${selected ? "is-selected" : ""}`}
              >
                <span className="resume-template-selector__thumb">
                  <img src={template.preview_url} alt={template.name} />
                </span>
                <span className="resume-template-selector__body">
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                  <em>{(template.style_tags || []).slice(0, 4).join(" / ")}</em>
                </span>
                <span className="resume-template-selector__state">
                  {selected ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                  {selected ? "当前模板" : "选择"}
                </span>
              </button>
            );
          })
        ) : (
          <div className="resume-template-selector__empty">
            <FileText size={20} />
            模板库暂未加载
          </div>
        )}
      </div>
    </section>
  );
}
