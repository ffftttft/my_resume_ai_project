import React from "react";

import JobTargetSection from "./JobTargetSection";
import UploadDropZone from "./UploadDropZone";

function TextArea({ value, onChange, placeholder, rows = 14 }) {
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

export default function ExistingResumePanel({
  jobInfo,
  onJobFieldChange,
  onApplyGenericJobInfo,
  statusText,
  loading,
  jobInfoReady,
  resumeSourceText,
  resumeSourceName,
  additionalAnswerCount,
  onResumeSourceChange,
  onUploadResumeFile,
  onClearInfo,
  onBack,
  hasPendingQuestions,
  onOpenQuestions,
  sectionIds = {},
}) {
  return (
    <div className="subpage-flow">
      <JobTargetSection
        id={sectionIds.jobTarget}
        jobInfo={jobInfo}
        onFieldChange={onJobFieldChange}
        title="目标岗位信息 · 现有简历优化"
        description="用于明确目标岗位、职责要求与优化方向。"
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

      <section id={sectionIds.status} className="paper-panel form-section-card p-6">
        <div className="form-section-card__head">
          <div>
            <h3 className="form-section-card__title">资料状态</h3>
            <p className="form-section-card__subtitle">
              确认岗位信息与简历原文后，回到工作台使用外层主按钮启动流式优化。
            </p>
          </div>

          <div className="control-deck__actions">
            <button type="button" onClick={onClearInfo} className="pill-button pill-button--ghost">
              清空资料
            </button>
          </div>
        </div>

        <p className="form-section-card__status-note">{statusText}</p>

        <div className="entry-metric-grid">
          <div className="entry-metric">
            <span className="entry-metric__label">岗位信息</span>
            <strong className="entry-metric__value">{jobInfoReady ? "已完成" : "待完善"}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">简历原文</span>
            <strong className="entry-metric__value">{resumeSourceName || "未上传文件"}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">内容状态</span>
            <strong className="entry-metric__value">{resumeSourceText.trim() ? "已提取 / 已粘贴" : "待录入"}</strong>
          </div>
          <div className="entry-metric">
            <span className="entry-metric__label">补充回答</span>
            <strong className="entry-metric__value">{additionalAnswerCount}</strong>
          </div>
        </div>
      </section>

      <section id={sectionIds.source} className="paper-panel form-section-card p-6">
        <div className="form-section-card__head">
          <div>
            <h3 className="form-section-card__title">简历原文</h3>
            <p className="form-section-card__subtitle">
              支持上传 PDF / TXT / MD / DOC / DOCX，也可以直接粘贴正文。
            </p>
          </div>
        </div>

        <UploadDropZone
          accept=".pdf,.txt,.md,.doc,.docx"
          buttonLabel={resumeSourceName ? "重新上传当前简历" : "上传简历"}
          title={resumeSourceName ? "替换当前简历文件" : "点击选择简历，或直接拖拽到这里"}
          description="推荐上传 PDF 或 DOCX。上传记录仍支持在历史区预览和删除。"
          disabled={loading}
          onFilesSelected={onUploadResumeFile}
        />

        {resumeSourceName ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip accent-chip">当前文件</span>
            <span className="chip">{resumeSourceName}</span>
          </div>
        ) : null}

        <div className="mt-5">
          <TextArea
            value={resumeSourceText}
            onChange={onResumeSourceChange}
            rows={16}
            placeholder="把你现有的简历正文粘贴到这里，或者先上传 PDF / TXT / MD / DOC / DOCX。"
          />
        </div>
      </section>
    </div>
  );
}
