import { z } from "zod";

const stringField = z.string();
const stringListField = z.array(z.string());

const REQUEST_FIELD_LABELS = {
  "profile.basic_info.name": "姓名",
  "profile.basic_info.birth_date": "出生日期",
  "profile.basic_info.gender": "性别",
  "profile.basic_info.political_status": "政治面貌",
  "profile.basic_info.target_company": "目标公司",
  "profile.basic_info.target_role": "目标岗位",
  "profile.basic_info.job_requirements": "岗位要求",
  "profile.basic_info.email": "邮箱",
  "profile.basic_info.phone": "电话",
  "profile.basic_info.city": "城市",
  "profile.basic_info.summary": "个人摘要",
};

function toFieldPath(path) {
  return Array.isArray(path) ? path.join(".") : "";
}

function toReadableIssue(issue) {
  const fieldPath = toFieldPath(issue?.path);
  const fieldLabel = REQUEST_FIELD_LABELS[fieldPath] || fieldPath || "字段";

  if (issue?.code === "invalid_type") {
    if (issue.received === "undefined") {
      return `${fieldLabel}不能为空`;
    }
    return `${fieldLabel}格式不正确`;
  }

  if (issue?.code === "too_small") {
    return `${fieldLabel}不能为空`;
  }

  if (issue?.message) {
    return `${fieldLabel}：${issue.message}`;
  }

  return `${fieldLabel}填写有误`;
}

function parseWithReadableError(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  const issues = result.error?.issues || [];
  const message = issues.length > 0 ? issues.map(toReadableIssue).join("；") : "提交内容有误，请检查后重试。";
  throw new Error(message);
}

export const contactSchema = z
  .object({
    full_name: stringField,
    birth_date: z.string().default(""),
    gender: z.string().default(""),
    political_status: z.string().default(""),
    email: stringField,
    phone: stringField,
    city: stringField,
    target_company: stringField,
    target_role: stringField,
  })
  .strict();

export const skillCategorySchema = z
  .object({
    category: stringField,
    items: stringListField,
  })
  .strict();

export const experienceRecordSchema = z
  .object({
    company_name: stringField,
    job_title: stringField,
    department: z.string().default(""),
    location: z.string().default(""),
    start_date: stringField,
    end_date: stringField,
    role_scope: z.string().default(""),
    summary: z.string().default(""),
    achievements: stringListField,
    tools: stringListField,
  })
  .strict();

export const projectRecordSchema = z
  .object({
    project_name: stringField,
    role: stringField,
    start_date: stringField,
    end_date: stringField,
    project_summary: stringField,
    achievements: stringListField,
    tools: stringListField,
    project_url: z.string().default(""),
  })
  .strict();

export const awardRecordSchema = z
  .object({
    award_name: stringField,
    date: stringField,
    level: stringField,
    issuer: stringField,
    description: stringField,
  })
  .strict();

export const educationRecordSchema = z
  .object({
    school_name: stringField,
    degree: stringField,
    major: stringField,
    start_date: stringField,
    end_date: stringField,
    gpa: z.string().default(""),
    ranking: z.string().default(""),
    courses: stringListField.default([]),
    highlights: stringListField,
  })
  .strict();

export const structuredResumeSchema = z
  .object({
    contact: contactSchema,
    summary: stringField,
    experience: z.array(experienceRecordSchema),
    education: z.array(educationRecordSchema),
    skills: z.array(skillCategorySchema),
    projects: z.array(projectRecordSchema),
    awards: z.array(awardRecordSchema).default([]),
  })
  .strict();

export const contractReportSchema = z
  .object({
    schema_name: stringField,
    schema_version: stringField,
    validated: z.boolean(),
    renderer: stringField,
    source: z.enum(["model", "fallback"]),
    llm_contract_ok: z.boolean(),
    warning: stringField,
    question_count: z.number(),
    section_counts: z
      .object({
        experience: z.number(),
        projects: z.number(),
        awards: z.number().default(0),
        education: z.number(),
        skill_categories: z.number(),
      })
      .strict(),
  })
  .strict();

export const workspaceResultSchema = z
  .object({
    title: stringField,
    resume_text: stringField,
    analysis_notes: stringListField,
    questions: stringListField,
    needs_clarification: z.boolean(),
    used_ai: z.boolean(),
    mode: stringField,
    structured_resume: structuredResumeSchema,
    contract_report: contractReportSchema,
  })
  .strict();

export const semanticAtsScoreSchema = z
  .object({
    overallScore: z.number(),
    matchedKeywords: stringListField,
    missingKeywords: stringListField,
    improvementTip: stringField,
    mode: stringField,
    semanticSimilarity: z.number(),
    keywordCoverage: z.number(),
    provider: stringField,
    model: stringField,
    scoreBreakdown: z
      .array(
        z
          .object({
            key: stringField,
            label: stringField,
            score: z.number(),
            weight: z.number(),
          })
          .strict(),
      )
      .optional(),
    riskFlags: stringListField.optional(),
    scoringVersion: stringField,
    warning: stringField.optional(),
  })
  .strict();

export const ragReferenceSchema = z
  .object({
    id: stringField,
    title: stringField,
    role: stringField,
    industry: stringField,
    similarity: z.number(),
    key_terms: stringListField,
    excerpt: stringField,
    source_title: stringField.optional(),
    source_url: stringField.optional(),
    source_note: stringField.optional(),
  })
  .strict();

export const ragSearchResponseSchema = z
  .object({
    mode: stringField,
    count: z.number(),
    results: z.array(ragReferenceSchema),
    warning: stringField.optional(),
  })
  .strict();

export const jobContextSearchResultSchema = z
  .object({
    title: stringField,
    url: stringField,
    source: stringField,
    snippet: stringField,
    published_at: stringField,
    score: z.number(),
  })
  .strict();

export const jobContextSearchResponseSchema = z
  .object({
    query: stringField,
    provider: stringField,
    mode: stringField,
    cached: z.boolean(),
    results: z.array(jobContextSearchResultSchema),
    warning: stringField,
  })
  .strict();

const partialContactSchema = z
  .object({
    full_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    target_company: z.string().optional(),
    target_role: z.string().optional(),
  })
  .partial()
  .passthrough();

const partialSkillCategorySchema = z
  .object({
    category: z.string().optional(),
    items: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough();

const partialExperienceRecordSchema = z
  .object({
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    role_scope: z.string().optional(),
    achievements: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough();

const partialProjectRecordSchema = z
  .object({
    project_name: z.string().optional(),
    role: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    project_summary: z.string().optional(),
    achievements: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough();

const partialAwardRecordSchema = z
  .object({
    award_name: z.string().optional(),
    date: z.string().optional(),
    level: z.string().optional(),
    issuer: z.string().optional(),
    description: z.string().optional(),
  })
  .partial()
  .passthrough();

const partialEducationRecordSchema = z
  .object({
    school_name: z.string().optional(),
    degree: z.string().optional(),
    major: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })
  .partial()
  .passthrough();

const partialStructuredResumeSchema = z
  .object({
    contact: partialContactSchema.optional(),
    summary: z.string().optional(),
    experience: z.array(partialExperienceRecordSchema).optional(),
    education: z.array(partialEducationRecordSchema).optional(),
    skills: z.array(partialSkillCategorySchema).optional(),
    projects: z.array(partialProjectRecordSchema).optional(),
    awards: z.array(partialAwardRecordSchema).optional(),
  })
  .partial()
  .passthrough();

const partialContractReportSchema = z
  .object({
    schema_name: z.string().optional(),
    schema_version: z.string().optional(),
    validated: z.boolean().optional(),
    renderer: z.string().optional(),
    source: z.enum(["model", "fallback"]).optional(),
    llm_contract_ok: z.boolean().optional(),
    warning: z.string().optional(),
    question_count: z.number().optional(),
    section_counts: z
      .object({
        experience: z.number().optional(),
        projects: z.number().optional(),
        awards: z.number().optional(),
        education: z.number().optional(),
        skill_categories: z.number().optional(),
      })
      .partial()
      .passthrough()
      .optional(),
  })
  .partial()
  .passthrough();

export const partialWorkspaceResultSchema = z
  .object({
    title: z.string().optional(),
    analysis_notes: z.array(z.string()).optional(),
    questions: z.array(z.string()).optional(),
    structured_resume: partialStructuredResumeSchema.nullable().optional(),
    contract_report: partialContractReportSchema.nullable().optional(),
  })
  .partial()
  .passthrough();

export function parseWorkspaceResult(payload) {
  return workspaceResultSchema.parse(payload);
}

export function parseSemanticAtsScore(payload) {
  return semanticAtsScoreSchema.parse(payload);
}

export function parseRagSearchResponse(payload) {
  return ragSearchResponseSchema.parse(payload);
}

export function parseJobContextSearchResponse(payload) {
  return jobContextSearchResponseSchema.parse(payload);
}

export function parsePartialWorkspaceResult(payload) {
  const parsed = partialWorkspaceResultSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      title: "",
      analysis_notes: [],
      questions: [],
      structured_resume: null,
      contract_report: null,
    };
  }

  const data = parsed.data;
  return {
    title: typeof data.title === "string" ? data.title : "",
    analysis_notes: Array.isArray(data.analysis_notes) ? data.analysis_notes : [],
    questions: Array.isArray(data.questions) ? data.questions : [],
    structured_resume: data.structured_resume && typeof data.structured_resume === "object" ? data.structured_resume : null,
    contract_report: data.contract_report && typeof data.contract_report === "object" ? data.contract_report : null,
  };
}

export const clarificationAnswerRequestSchema = z
  .object({
    question: stringField,
    answer: stringField,
  })
  .strict();

export const basicInfoRequestSchema = z
  .object({
    name: stringField,
    birth_date: z.string().default(""),
    gender: z.string().default(""),
    political_status: z.string().default(""),
    target_company: z.string().default(""),
    target_role: z.string().default(""),
    job_requirements: z.string().default(""),
    email: stringField,
    phone: stringField,
    city: stringField,
    summary: stringField,
  })
  .strict();

export const educationItemRequestSchema = z
  .object({
    school: stringField,
    degree: stringField,
    major: stringField,
    start_date: stringField,
    end_date: stringField,
    gpa: z.string().default(""),
    ranking: z.string().default(""),
    courses: stringListField.default([]),
    highlights: stringListField,
  })
  .strict();

export const experienceItemRequestSchema = z
  .object({
    company: stringField,
    role: stringField,
    department: z.string().default(""),
    location: z.string().default(""),
    start_date: stringField,
    end_date: stringField,
    summary: z.string().default(""),
    tools: stringListField.default([]),
    highlights: stringListField,
    attachment_name: stringField,
    attachment_context: stringField,
  })
  .strict();

export const projectItemRequestSchema = z
  .object({
    name: stringField,
    role: stringField,
    start_date: stringField,
    end_date: stringField,
    description: stringField,
    tools: stringListField.default([]),
    project_url: z.string().default(""),
    highlights: stringListField,
    attachment_name: stringField,
    attachment_context: stringField,
  })
  .strict();

export const awardItemRequestSchema = z
  .object({
    award_name: stringField,
    date: stringField,
    level: stringField,
    issuer: stringField,
    description: stringField,
  })
  .strict();

export const userProfileRequestSchema = z
  .object({
    basic_info: basicInfoRequestSchema,
    skills: stringListField,
    education: z.array(educationItemRequestSchema),
    experiences: z.array(experienceItemRequestSchema),
    projects: z.array(projectItemRequestSchema),
    awards: z.array(awardItemRequestSchema).default([]),
    modules: stringListField,
    membership_level: z.enum(["basic", "advanced"]),
    use_full_information: z.boolean(),
    uploaded_context: stringField,
    additional_answers: z.array(clarificationAnswerRequestSchema),
  })
  .strict();

export const generateResumeRequestSchema = z
  .object({
    profile: userProfileRequestSchema,
    template_id: z.string().optional(),
  })
  .strict();

export const clarificationRequestSchema = generateResumeRequestSchema;

export const reviseResumeRequestSchema = z
  .object({
    profile: userProfileRequestSchema,
    resume_text: stringField,
    instruction: stringField,
  })
  .strict();

export const semanticAtsScoreRequestSchema = z
  .object({
    resume_text: stringField,
    job_description: stringField,
  })
  .strict();

export const ragSearchRequestSchema = z
  .object({
    query: stringField,
    top_k: z.number().int().min(1).max(8).default(4),
  })
  .strict();

export const jobContextSearchRequestSchema = z
  .object({
    target_company: z.string().default(""),
    target_role: z.string().default(""),
    job_requirements: z.string().default(""),
    force_refresh: z.boolean().optional(),
  })
  .strict();

export const saveResumeSnapshotRequestSchema = z
  .object({
    title: stringField,
    target_company: stringField,
    target_role: stringField,
    resume_text: stringField,
    generation_mode: stringField,
    analysis_notes: stringListField,
    board: z.string().optional(),
    workspace: z.record(z.string(), z.unknown()).optional(),
    form_state: z.record(z.string(), z.unknown()).optional(),
    image_generation: z.record(z.string(), z.unknown()).optional(),
    resume_image_page_open: z.boolean().optional(),
  })
  .strict();

export const existingResumeOptimizeRequestSchema = z
    .object({
      resume_text: stringField,
      target_company: z.string().default(""),
      target_role: z.string().default(""),
      job_requirements: z.string().default(""),
      instruction: z.string().default(""),
      additional_answers: z.array(clarificationAnswerRequestSchema),
      template_id: z.string().optional(),
    })
  .strict();

export function parseGenerateResumeRequest(payload) {
  return parseWithReadableError(generateResumeRequestSchema, payload);
}

export function parseClarificationRequest(payload) {
  return parseWithReadableError(clarificationRequestSchema, payload);
}

export function parseReviseResumeRequest(payload) {
  return parseWithReadableError(reviseResumeRequestSchema, payload);
}

export function parseSemanticAtsScoreRequest(payload) {
  return parseWithReadableError(semanticAtsScoreRequestSchema, payload);
}

export function parseRagSearchRequest(payload) {
  return parseWithReadableError(ragSearchRequestSchema, payload);
}

export function parseJobContextSearchRequest(payload) {
  return parseWithReadableError(jobContextSearchRequestSchema, payload);
}

export function parseExistingResumeOptimizeRequest(payload) {
  return parseWithReadableError(existingResumeOptimizeRequestSchema, payload);
}

export function parseSaveResumeSnapshotRequest(payload) {
  return parseWithReadableError(saveResumeSnapshotRequestSchema, payload);
}
