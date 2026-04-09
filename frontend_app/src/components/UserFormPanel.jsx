import React from "react";

import JobTargetSection from "./JobTargetSection";
import UploadDropZone from "./UploadDropZone";

const MODULE_OPTIONS = [
  { value: "summary", label: "个人简介" },
  { value: "skills", label: "技能模块" },
  { value: "education", label: "教育经历" },
  { value: "projects", label: "项目经历" },
  { value: "experience", label: "实习/工作经历" },
  { value: "attachments", label: "附件摘要" },
];

function Field({ label, children, hint }) {
  return (
    <label className="form-field">
      <div className="form-field__head">
        <span className="form-field__label">{label}</span>
        {hint ? <span className="form-field__hint">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="field-shell w-full px-4 py-3 outline-none"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="field-shell w-full resize-y px-4 py-3 outline-none"
    />
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="paper-panel form-section-card p-6">
      <div className="form-section-card__head">
        <div>
          <h3 className="form-section-card__title">{title}</h3>
          {subtitle ? <p className="form-section-card__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="mini-outline-button">
      删除
    </button>
  );
}

function AttachmentField({ item, listKey, index, onUploadFiles, loading }) {
  const itemLabel = listKey === "projects" ? "项目附件" : "经历附件";

  return (
    <div className="attachment-card">
      <div className="attachment-card__head">
        <p className="attachment-card__title">{itemLabel}</p>
        {item.attachment_name ? <span className="chip">{item.attachment_file_type || "已上传"}</span> : null}
      </div>

      <UploadDropZone
        accept=".pdf,.ppt,.pptx,.doc,.docx"
        buttonLabel={item.attachment_name ? "重新上传附件" : "上传附件"}
        title={item.attachment_name ? "替换当前附件" : "点击选择附件，或直接拖拽到这里"}
        description="支持 PDF / PPT / PPTX / DOC / DOCX。每条项目或经历可绑定 1 个附件。"
        disabled={loading}
        onFilesSelected={(files, inputElement) => onUploadFiles(listKey, index, files, inputElement)}
      />

      {item.attachment_name ? (
        <div className="attachment-card__preview">
          <p className="attachment-card__name">{item.attachment_name}</p>
          <p className="attachment-card__text">
            {item.attachment_preview || "当前附件暂时没有可展示的提取文本。"}
          </p>
          {item.attachment_todo_notice ? (
            <p className="attachment-card__note">{item.attachment_todo_notice}</p>
          ) : null}
        </div>
      ) : null}

      {loading ? <p className="attachment-card__loading">上传处理中...</p> : null}
    </div>
  );
}

export default function UserFormPanel({
  jobInfo,
  formState,
  statusText,
  loading,
  jobInfoReady,
  draftSaving,
  draftSaveStatus,
  onSaveDraft,
  onClearInfo,
  onRestoreBackup,
  hasSavedBackup,
  onJobFieldChange,
  onApplyGenericJobInfo,
  onBasicInfoChange,
  onToggleFullInformation,
  onSkillsTextChange,
  onToggleModule,
  onUploadFiles,
  onListItemChange,
  onAddListItem,
  onRemoveListItem,
  onBack,
  hasPendingQuestions,
  onOpenQuestions,
}) {
  return (
    <div className="subpage-flow">
      <JobTargetSection
        jobInfo={jobInfo}
        onFieldChange={onJobFieldChange}
        title="目标岗位信息 · 新建简历"
        description="用于明确目标岗位、职责要求与生成方向。"
        actions={
          <>
            <button type="button" onClick={onBack} className="mini-outline-button">
              返回工作台
            </button>
            {hasPendingQuestions ? (
              <button type="button" onClick={onOpenQuestions} className="mini-outline-button">
                继续补充回答
              </button>
            ) : null}
            <button type="button" onClick={onApplyGenericJobInfo} className="job-target__action">
              套用通用岗位模板
            </button>
          </>
        }
      />

      <SectionCard title="资料管理" subtitle="保存当前资料后，回到工作台从外层主按钮启动生成。">
        <div className="control-deck__actions">
          <button type="button" onClick={onClearInfo} className="pill-button pill-button--ghost">
            清空资料
          </button>
          <button
            type="button"
            onClick={onRestoreBackup}
            disabled={!hasSavedBackup}
            className="pill-button pill-button--ghost"
          >
            恢复最近保存
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={draftSaving}
            className="pill-button pill-button--tint"
          >
            {draftSaving ? "保存中..." : "保存资料"}
          </button>
        </div>

        <p className="form-section-card__status-note">{statusText}</p>

        <div className="entry-metric-grid">
          <div className="entry-metric">
            <span className="entry-metric__label">保存状态</span>
            <strong className="entry-metric__value">{draftSaveStatus || "等待填写后保存"}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">岗位信息</span>
            <strong className="entry-metric__value">{jobInfoReady ? "已完成" : "待完善"}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">输出模块</span>
            <strong className="entry-metric__value">{formState.modules.length}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">补充回答</span>
            <strong className="entry-metric__value">{formState.additional_answers.length}</strong>
          </div>
        </div>

        <div>
          <p className="form-subtitle">输出模块</p>
          <div className="module-option-grid">
            {MODULE_OPTIONS.map((option) => (
              <label key={option.value} className="module-option">
                <input
                  type="checkbox"
                  checked={formState.modules.includes(option.value)}
                  onChange={() => onToggleModule(option.value)}
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="个人资料" subtitle="填写基础信息与个人概述。">
        <div className="space-y-4">
          <Field label="姓名">
            <TextInput value={formState.basic_info.name} onChange={(value) => onBasicInfoChange("name", value)} placeholder="例如：张三" />
          </Field>
          <Field label="邮箱">
            <TextInput value={formState.basic_info.email} onChange={(value) => onBasicInfoChange("email", value)} placeholder="zhangsan@example.com" />
          </Field>
          <Field label="电话">
            <TextInput value={formState.basic_info.phone} onChange={(value) => onBasicInfoChange("phone", value)} placeholder="13800000000" />
          </Field>
          <Field label="城市">
            <TextInput value={formState.basic_info.city} onChange={(value) => onBasicInfoChange("city", value)} placeholder="上海 / 杭州 / 深圳" />
          </Field>
        </div>

        <Field label="个人摘要" hint="可以留空，交给 AI 首次生成">
          <TextArea
            value={formState.basic_info.summary}
            onChange={(value) => onBasicInfoChange("summary", value)}
            placeholder="例如：关注后端接口设计、性能优化和工程化交付。"
            rows={4}
          />
        </Field>

        <label className="toggle-card">
          <input
            type="checkbox"
            checked={formState.use_full_information}
            onChange={(event) => onToggleFullInformation(event.target.checked)}
            className="h-4 w-4 rounded accent-[var(--accent)]"
          />
          <div>
            <p className="toggle-card__title">保留完整资料</p>
            <p className="toggle-card__description">开启后会尽量保留更多背景细节与补充信息。</p>
          </div>
        </label>
      </SectionCard>

      <SectionCard title="技能" subtitle="支持逗号或换行分隔。">
        <Field label="技能清单">
          <TextArea value={formState.skills_text} onChange={onSkillsTextChange} placeholder="Python, FastAPI, MySQL, React, Docker" rows={4} />
        </Field>
      </SectionCard>

      <SectionCard
        title="教育经历"
        subtitle="每条亮点支持逗号或换行分隔，例如 GPA、课程、奖项。"
        action={
          <button type="button" onClick={() => onAddListItem("education")} className="mini-outline-button">
            添加教育
          </button>
        }
      >
        {formState.education.map((item, index) => (
          <div key={`education-${index}`} className="form-stack-card">
            <div className="form-stack-card__head">
              <p className="form-stack-card__title">教育经历 #{index + 1}</p>
              {formState.education.length > 1 ? <RemoveButton onClick={() => onRemoveListItem("education", index)} /> : null}
            </div>
            <div className="space-y-4">
              <Field label="学校">
                <TextInput value={item.school} onChange={(value) => onListItemChange("education", index, "school", value)} placeholder="XX 大学" />
              </Field>
              <Field label="学历">
                <TextInput value={item.degree} onChange={(value) => onListItemChange("education", index, "degree", value)} placeholder="本科 / 硕士" />
              </Field>
              <Field label="专业">
                <TextInput value={item.major} onChange={(value) => onListItemChange("education", index, "major", value)} placeholder="软件工程" />
              </Field>
              <Field label="起止时间">
                <TextInput value={item.duration} onChange={(value) => onListItemChange("education", index, "duration", value)} placeholder="2022-09 至 2026-06" />
              </Field>
            </div>
            <Field label="亮点">
              <TextArea value={item.highlights_text} onChange={(value) => onListItemChange("education", index, "highlights_text", value)} placeholder={"GPA 3.7/4.0\n主修数据库系统与软件测试"} rows={3} />
            </Field>
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title="项目经历"
        subtitle="每个项目都可以绑定一个附件，AI 会从附件摘要里补足项目细节。"
        action={
          <button type="button" onClick={() => onAddListItem("projects")} className="mini-outline-button">
            添加项目
          </button>
        }
      >
        {formState.projects.map((item, index) => (
          <div key={`project-${index}`} className="form-stack-card">
            <div className="form-stack-card__head">
              <p className="form-stack-card__title">项目经历 #{index + 1}</p>
              {formState.projects.length > 1 ? <RemoveButton onClick={() => onRemoveListItem("projects", index)} /> : null}
            </div>
            <div className="space-y-4">
              <Field label="项目名称">
                <TextInput value={item.name} onChange={(value) => onListItemChange("projects", index, "name", value)} placeholder="校园活动管理平台" />
              </Field>
              <Field label="你的角色">
                <TextInput value={item.role} onChange={(value) => onListItemChange("projects", index, "role", value)} placeholder="全栈开发 / 后端负责人" />
              </Field>
              <Field label="起止时间">
                <TextInput value={item.duration} onChange={(value) => onListItemChange("projects", index, "duration", value)} placeholder="2025-02 至 2025-05" />
              </Field>
            </div>
            <Field label="项目描述">
              <TextArea value={item.description} onChange={(value) => onListItemChange("projects", index, "description", value)} placeholder="简述项目目标、场景和你的核心任务。" rows={3} />
            </Field>
            <Field label="项目亮点">
              <TextArea value={item.highlights_text} onChange={(value) => onListItemChange("projects", index, "highlights_text", value)} placeholder={"使用 FastAPI + React 开发\n接口响应时间降低 30%"} rows={4} />
            </Field>
            <AttachmentField item={item} listKey="projects" index={index} onUploadFiles={onUploadFiles} loading={loading} />
          </div>
        ))}
      </SectionCard>

      <SectionCard
        title="实习 / 工作经历"
        subtitle="每段经历也支持绑定一个附件，例如周报、总结或汇报材料。"
        action={
          <button type="button" onClick={() => onAddListItem("experiences")} className="mini-outline-button">
            添加经历
          </button>
        }
      >
        {formState.experiences.map((item, index) => (
          <div key={`experience-${index}`} className="form-stack-card">
            <div className="form-stack-card__head">
              <p className="form-stack-card__title">实习 / 工作经历 #{index + 1}</p>
              {formState.experiences.length > 1 ? <RemoveButton onClick={() => onRemoveListItem("experiences", index)} /> : null}
            </div>
            <div className="space-y-4">
              <Field label="公司">
                <TextInput value={item.company} onChange={(value) => onListItemChange("experiences", index, "company", value)} placeholder="示例科技" />
              </Field>
              <Field label="岗位">
                <TextInput value={item.role} onChange={(value) => onListItemChange("experiences", index, "role", value)} placeholder="后端开发实习生" />
              </Field>
              <Field label="起止时间">
                <TextInput value={item.duration} onChange={(value) => onListItemChange("experiences", index, "duration", value)} placeholder="2025-07 至 2025-10" />
              </Field>
            </div>
            <Field label="经历亮点">
              <TextArea value={item.highlights_text} onChange={(value) => onListItemChange("experiences", index, "highlights_text", value)} placeholder={"负责接口开发\n优化 SQL 查询延迟 30%"} rows={4} />
            </Field>
            <AttachmentField item={item} listKey="experiences" index={index} onUploadFiles={onUploadFiles} loading={loading} />
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
