import { z } from "zod";

const stringField = z.string().catch("");
const stringListField = z.array(z.string()).catch([]);

export const contactSchema = z
  .object({
    full_name: stringField,
    email: stringField,
    phone: stringField,
    city: stringField,
    target_company: stringField,
    target_role: stringField,
  })
  .passthrough();

export const skillCategorySchema = z
  .object({
    category: stringField,
    items: stringListField,
  })
  .passthrough();

export const experienceRecordSchema = z
  .object({
    company_name: stringField,
    job_title: stringField,
    start_date: stringField,
    end_date: stringField,
    role_scope: stringField,
    achievements: stringListField,
    tools: stringListField,
  })
  .passthrough();

export const projectRecordSchema = z
  .object({
    project_name: stringField,
    role: stringField,
    start_date: stringField,
    end_date: stringField,
    project_summary: stringField,
    achievements: stringListField,
    tools: stringListField,
  })
  .passthrough();

export const educationRecordSchema = z
  .object({
    school_name: stringField,
    degree: stringField,
    major: stringField,
    start_date: stringField,
    end_date: stringField,
    highlights: stringListField,
  })
  .passthrough();

export const structuredResumeSchema = z
  .object({
    contact: contactSchema.catch({
      full_name: "",
      email: "",
      phone: "",
      city: "",
      target_company: "",
      target_role: "",
    }),
    summary: stringField,
    experience: z.array(experienceRecordSchema).catch([]),
    education: z.array(educationRecordSchema).catch([]),
    skills: z.array(skillCategorySchema).catch([]),
    projects: z.array(projectRecordSchema).catch([]),
  })
  .passthrough();

export const contractReportSchema = z
  .object({
    schema_name: stringField,
    schema_version: stringField,
    validated: z.boolean().catch(false),
    renderer: stringField,
    question_count: z.number().catch(0),
    section_counts: z
      .object({
        experience: z.number().catch(0),
        projects: z.number().catch(0),
        education: z.number().catch(0),
        skill_categories: z.number().catch(0),
      })
      .catch({
        experience: 0,
        projects: 0,
        education: 0,
        skill_categories: 0,
      }),
  })
  .passthrough();

export const workspaceResultSchema = z
  .object({
    title: stringField,
    resume_text: stringField,
    analysis_notes: stringListField,
    questions: stringListField,
    needs_clarification: z.boolean().catch(false),
    used_ai: z.boolean().catch(false),
    mode: stringField,
    structured_resume: structuredResumeSchema.optional(),
    contract_report: contractReportSchema.optional(),
  })
  .passthrough();

export function parseWorkspaceResult(payload) {
  return workspaceResultSchema.parse(payload);
}

