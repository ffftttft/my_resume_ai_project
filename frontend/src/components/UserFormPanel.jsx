// Right-side form panel for editing candidate information and triggering resume generation.
import React from "react";

const MODULE_OPTIONS = [
  { value: "summary", label: "个人简介" },
  { value: "skills", label: "技能模块" },
  { value: "education", label: "教育经历" },
  { value: "projects", label: "项目经历" },
  { value: "experience", label: "实习经历" },
  { value: "attachments", label: "附件摘要" },
];

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
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
    <section className="rounded-[24px] border border-slate-200 bg-white/72 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
    >
      删除
    </button>
  );
}

function AttachmentField({ item, listKey, index, onUploadFiles, loading }) {
  const itemLabel = listKey === "projects" ? "项目附件" : "经历附件";

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">{itemLabel}</p>
        {item.attachment_name && <span className="chip">{item.attachment_file_type || "已上传"}</span>}
      </div>

      <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-center transition hover:border-[var(--accent)]">
        <input
          type="file"
          accept=".pdf,.ppt,.pptx"
          onChange={(event) => onUploadFiles(listKey, index, event.target.files, event.target)}
          className="hidden"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {item.attachment_name ? "重新上传当前附件" : "上传与当前经历对应的附件"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">每条项目/实习经历绑定 1 个 PDF、PPT 或 PPTX。</p>
        </div>
      </label>

      {item.attachment_name && (
        <div className="mt-3 rounded-[16px] border border-slate-200 bg-slate-50/80 p-3">
          <p className="font-semibold text-[var(--ink)]">{item.attachment_name}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {item.attachment_preview || "当前附件暂无可提取文本。"}
          </p>
          {item.attachment_todo_notice && (
            <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{item.attachment_todo_notice}</p>
          )}
        </div>
      )}

      {loading && <p className="mt-2 text-xs text-[var(--muted)]">上传处理中...</p>}
    </div>
  );
}

export default function UserFormPanel({
  formState,
  statusText,
  backendStatus,
  loading,
  draftSaving,
  draftSaveStatus,
  onSaveDraft,
  onClearInfo,
  onRestoreBackup,
  hasSavedBackup,
  onBasicInfoChange,
  onMembershipChange,
  onToggleFullInformation,
  onSkillsTextChange,
  onToggleModule,
  onUploadFiles,
  onListItemChange,
  onAddListItem,
  onRemoveListItem,
  onGenerate,
}) {
  // Example props:
  // <UserFormPanel formState={state} onGenerate={...} />
  return (
    <section className="paper-panel p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
            Input Studio
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">候选人信息面板</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="chip">{backendStatus?.status === "ok" ? "后端已连接" : "等待后端"}</span>
          <span className="chip accent-chip">
            {backendStatus?.ai_available ? `AI: ${backendStatus.model}` : "AI: 本地兜底"}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]">
        {statusText}
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/72 p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClearInfo}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-50"
          >
            清空信息
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={draftSaving}
            className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {draftSaving ? "保存中..." : "保存信息"}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "生成中..." : "AI生成简历"}
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--muted)]">
          {draftSaveStatus || "个人信息支持手动保存，且会每 30 秒自动保存一次。"}
        </p>

        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-[var(--ink)]">生成模块</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MODULE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={formState.modules.includes(option.value)}
                  onChange={() => onToggleModule(option.value)}
                  className="h-4 w-4 rounded accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--ink)]">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <SectionCard
          title="基本信息"
          subtitle="基础信息允许不完整，系统会优先围绕项目和实习内容发起追问。"
          action={
            <button
              type="button"
              onClick={onRestoreBackup}
              disabled={!hasSavedBackup}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              恢复默认备份
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="姓名">
              <TextInput
                value={formState.basic_info.name}
                onChange={(value) => onBasicInfoChange("name", value)}
                placeholder="例如：张三"
              />
            </Field>
            <Field label="求职公司">
              <TextInput
                value={formState.basic_info.target_company}
                onChange={(value) => onBasicInfoChange("target_company", value)}
                placeholder="例如：字节跳动 / 腾讯 / 阿里云"
              />
            </Field>
            <Field label="求职岗位">
              <TextInput
                value={formState.basic_info.target_role}
                onChange={(value) => onBasicInfoChange("target_role", value)}
                placeholder="例如：后端开发实习生"
              />
            </Field>
            <Field label="邮箱">
              <TextInput
                value={formState.basic_info.email}
                onChange={(value) => onBasicInfoChange("email", value)}
                placeholder="zhangsan@example.com"
              />
            </Field>
            <Field label="电话">
              <TextInput
                value={formState.basic_info.phone}
                onChange={(value) => onBasicInfoChange("phone", value)}
                placeholder="13800000000"
              />
            </Field>
            <Field label="城市">
              <TextInput
                value={formState.basic_info.city}
                onChange={(value) => onBasicInfoChange("city", value)}
                placeholder="上海 / 杭州 / 深圳"
              />
            </Field>
            <Field label="用户等级" hint="高级用户更适合启用更多信息">
              <select
                value={formState.membership_level}
                onChange={(event) => onMembershipChange(event.target.value)}
                className="field-shell w-full px-4 py-3 outline-none"
              >
                <option value="basic">普通用户</option>
                <option value="advanced">高级用户</option>
              </select>
            </Field>
          </div>

          <Field label="个人摘要" hint="可留空，系统会自动生成">
            <TextArea
              value={formState.basic_info.summary}
              onChange={(value) => onBasicInfoChange("summary", value)}
              placeholder="例如：关注后端接口设计、性能优化和工程化交付。"
              rows={4}
            />
          </Field>

          <Field label="招聘要求" hint="把 JD 里的关键要求贴进来，AI 会按这个方向生成。">
            <TextArea
              value={formState.basic_info.job_requirements}
              onChange={(value) => onBasicInfoChange("job_requirements", value)}
              placeholder="例如：熟悉 Python / MySQL / Linux，了解接口设计、性能优化和工程化流程。"
              rows={5}
            />
          </Field>

          <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3">
            <input
              type="checkbox"
              checked={formState.use_full_information}
              onChange={(event) => onToggleFullInformation(event.target.checked)}
              className="h-4 w-4 rounded accent-[var(--accent)]"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">启用全量信息</p>
              <p className="text-xs text-[var(--muted)]">
                普通用户默认压缩信息，高级用户建议打开以保留更多细节。
              </p>
            </div>
          </label>
        </SectionCard>

        <SectionCard title="技能" subtitle="支持逗号或换行分隔。">
          <Field label="技能清单">
            <TextArea
              value={formState.skills_text}
              onChange={onSkillsTextChange}
              placeholder="Python, FastAPI, MySQL, React, Docker"
              rows={4}
            />
          </Field>
        </SectionCard>

        <SectionCard
          title="教育经历"
          subtitle="每条亮点使用逗号或换行分隔，例如 GPA、课程、奖项。"
          action={
            <button
              type="button"
              onClick={() => onAddListItem("education")}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
            >
              添加教育
            </button>
          }
        >
          {formState.education.map((item, index) => (
            <div key={`education-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50/75 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ink)]">教育经历 #{index + 1}</p>
                {formState.education.length > 1 && (
                  <RemoveButton onClick={() => onRemoveListItem("education", index)} />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="学校">
                  <TextInput
                    value={item.school}
                    onChange={(value) => onListItemChange("education", index, "school", value)}
                    placeholder="XX大学"
                  />
                </Field>
                <Field label="学历">
                  <TextInput
                    value={item.degree}
                    onChange={(value) => onListItemChange("education", index, "degree", value)}
                    placeholder="本科 / 硕士"
                  />
                </Field>
                <Field label="专业">
                  <TextInput
                    value={item.major}
                    onChange={(value) => onListItemChange("education", index, "major", value)}
                    placeholder="软件工程"
                  />
                </Field>
                <Field label="起止时间">
                  <TextInput
                    value={item.duration}
                    onChange={(value) => onListItemChange("education", index, "duration", value)}
                    placeholder="2022-09 至 2026-06"
                  />
                </Field>
              </div>
              <Field label="亮点">
                <TextArea
                  value={item.highlights_text}
                  onChange={(value) => onListItemChange("education", index, "highlights_text", value)}
                  placeholder={"GPA 3.7/4.0\n主修数据库系统与软件测试"}
                  rows={3}
                />
              </Field>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="项目经历"
          subtitle="每个项目都可以绑定一个附件，方便 AI 从项目汇报或作品集里抽取细节。"
          action={
            <button
              type="button"
              onClick={() => onAddListItem("projects")}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
            >
              添加项目
            </button>
          }
        >
          {formState.projects.map((item, index) => (
            <div key={`project-${index}`} className="rounded-[20px] border border-slate-200 bg-slate-50/75 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ink)]">项目经历 #{index + 1}</p>
                {formState.projects.length > 1 && (
                  <RemoveButton onClick={() => onRemoveListItem("projects", index)} />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="项目名称">
                  <TextInput
                    value={item.name}
                    onChange={(value) => onListItemChange("projects", index, "name", value)}
                    placeholder="校园活动管理平台"
                  />
                </Field>
                <Field label="你的角色">
                  <TextInput
                    value={item.role}
                    onChange={(value) => onListItemChange("projects", index, "role", value)}
                    placeholder="全栈开发 / 后端负责人"
                  />
                </Field>
                <Field label="起止时间">
                  <TextInput
                    value={item.duration}
                    onChange={(value) => onListItemChange("projects", index, "duration", value)}
                    placeholder="2025-02 至 2025-05"
                  />
                </Field>
              </div>
              <Field label="项目描述">
                <TextArea
                  value={item.description}
                  onChange={(value) => onListItemChange("projects", index, "description", value)}
                  placeholder="简述项目目标、场景和你的核心任务。"
                  rows={3}
                />
              </Field>
              <Field label="项目亮点">
                <TextArea
                  value={item.highlights_text}
                  onChange={(value) => onListItemChange("projects", index, "highlights_text", value)}
                  placeholder={"使用 FastAPI + React 开发\n接口响应时间降低 30%"}
                  rows={4}
                />
              </Field>
              <AttachmentField
                item={item}
                listKey="projects"
                index={index}
                onUploadFiles={onUploadFiles}
                loading={loading}
              />
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="实习/工作经历"
          subtitle="每段经历也支持绑定一个附件，例如周报、总结或汇报材料。"
          action={
            <button
              type="button"
              onClick={() => onAddListItem("experiences")}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
            >
              添加经历
            </button>
          }
        >
          {formState.experiences.map((item, index) => (
            <div
              key={`experience-${index}`}
              className="rounded-[20px] border border-slate-200 bg-slate-50/75 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ink)]">实习经历 #{index + 1}</p>
                {formState.experiences.length > 1 && (
                  <RemoveButton onClick={() => onRemoveListItem("experiences", index)} />
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="公司">
                  <TextInput
                    value={item.company}
                    onChange={(value) => onListItemChange("experiences", index, "company", value)}
                    placeholder="示例科技"
                  />
                </Field>
                <Field label="岗位">
                  <TextInput
                    value={item.role}
                    onChange={(value) => onListItemChange("experiences", index, "role", value)}
                    placeholder="后端开发实习生"
                  />
                </Field>
                <Field label="起止时间">
                  <TextInput
                    value={item.duration}
                    onChange={(value) => onListItemChange("experiences", index, "duration", value)}
                    placeholder="2025-07 至 2025-10"
                  />
                </Field>
              </div>
              <Field label="经历亮点">
                <TextArea
                  value={item.highlights_text}
                  onChange={(value) => onListItemChange("experiences", index, "highlights_text", value)}
                  placeholder={"负责接口开发\n优化 SQL 查询延迟 30%"}
                  rows={4}
                />
              </Field>
              <AttachmentField
                item={item}
                listKey="experiences"
                index={index}
                onUploadFiles={onUploadFiles}
                loading={loading}
              />
            </div>
          ))}
        </SectionCard>
      </div>
    </section>
  );
}
