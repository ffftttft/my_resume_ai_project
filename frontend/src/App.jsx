// Main frontend page that wires together the form, preview, question modal, and memory history.
import React, { useEffect, useRef, useState } from "react";

import {
  deleteResumeSnapshot,
  exportResumeFile,
  fetchHealth,
  fetchMemory,
  fetchModelStatus,
  generateResume,
  optimizeExistingResume,
  reviseResume,
  saveResumeSnapshot,
  saveWorkspaceDraft,
  uploadFiles,
} from "./api";
import ExistingResumePanel from "./components/ExistingResumePanel";
import HistoryCard from "./components/HistoryCard";
import ModelMonitorCard from "./components/ModelMonitorCard";
import QuestionCard from "./components/QuestionCard";
import ResumePreview from "./components/ResumePreview";
import UserFormPanel from "./components/UserFormPanel";

function createEmptyEducation() {
  return {
    school: "",
    degree: "",
    major: "",
    duration: "",
    highlights_text: "",
  };
}

function createEmptyProject() {
  return {
    name: "",
    role: "",
    duration: "",
    description: "",
    highlights_text: "",
    attachment_name: "",
    attachment_context: "",
    attachment_preview: "",
    attachment_file_type: "",
    attachment_todo_notice: "",
  };
}

function createEmptyExperience() {
  return {
    company: "",
    role: "",
    duration: "",
    highlights_text: "",
    attachment_name: "",
    attachment_context: "",
    attachment_preview: "",
    attachment_file_type: "",
    attachment_todo_notice: "",
  };
}

function cloneFormState(value) {
  return JSON.parse(JSON.stringify(value));
}

const INITIAL_FORM_STATE = {
  basic_info: {
    name: "",
    target_company: "",
    target_role: "",
    job_requirements: "",
    email: "",
    phone: "",
    city: "",
    summary: "",
  },
  skills_text: "",
  education: [createEmptyEducation()],
  projects: [createEmptyProject()],
  experiences: [createEmptyExperience()],
  modules: ["summary", "skills", "education", "projects", "experience", "attachments"],
  membership_level: "basic",
  use_full_information: false,
  uploaded_context: "",
  additional_answers: [],
};

function splitTextList(text) {
  return text
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDuration(duration) {
  const cleaned = duration.replace(/[—~]/g, "至");
  const [start = "", end = ""] = cleaned.split("至").map((item) => item.trim());
  return { start_date: start, end_date: end };
}

function hasContent(item) {
  return Object.values(item).some((value) => typeof value === "string" && value.trim());
}

function toEducationPayload(items) {
  return items
    .filter(hasContent)
    .map((item) => {
      const { start_date, end_date } = parseDuration(item.duration);
      return {
        school: item.school.trim(),
        degree: item.degree.trim(),
        major: item.major.trim(),
        start_date,
        end_date,
        highlights: splitTextList(item.highlights_text),
      };
    });
}

function toProjectPayload(items) {
  return items
    .filter(hasContent)
    .map((item) => {
      const { start_date, end_date } = parseDuration(item.duration);
      return {
        name: item.name.trim(),
        role: item.role.trim(),
        start_date,
        end_date,
        description: item.description.trim(),
        highlights: splitTextList(item.highlights_text),
        attachment_name: item.attachment_name || "",
        attachment_context: item.attachment_context || "",
      };
    });
}

function toExperiencePayload(items) {
  return items
    .filter(hasContent)
    .map((item) => {
      const { start_date, end_date } = parseDuration(item.duration);
      return {
        company: item.company.trim(),
        role: item.role.trim(),
        start_date,
        end_date,
        highlights: splitTextList(item.highlights_text),
        attachment_name: item.attachment_name || "",
        attachment_context: item.attachment_context || "",
      };
    });
}

function buildScopedAttachmentContext(formState) {
  return [...formState.projects, ...formState.experiences]
    .map((item) => item.attachment_context || "")
    .filter(Boolean)
    .join("\n\n");
}

function buildProfilePayload(formState) {
  return {
    basic_info: {
      name: formState.basic_info.name.trim(),
      target_company: formState.basic_info.target_company.trim(),
      target_role: formState.basic_info.target_role.trim(),
      job_requirements: formState.basic_info.job_requirements.trim(),
      email: formState.basic_info.email.trim(),
      phone: formState.basic_info.phone.trim(),
      city: formState.basic_info.city.trim(),
      summary: formState.basic_info.summary.trim(),
    },
    skills: splitTextList(formState.skills_text),
    education: toEducationPayload(formState.education),
    projects: toProjectPayload(formState.projects),
    experiences: toExperiencePayload(formState.experiences),
    modules: formState.modules.length > 0 ? formState.modules : ["summary"],
    membership_level: formState.membership_level,
    use_full_information: formState.use_full_information,
    uploaded_context: buildScopedAttachmentContext(formState),
    additional_answers: formState.additional_answers.filter((item) => item.answer.trim()),
  };
}

function slugifyFileName(title) {
  return (title || "resume")
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeResumeText(text) {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildResumeSnapshotTitle(targetCompany, targetRole) {
  return [targetCompany?.trim(), targetRole?.trim()].filter(Boolean).join("｜");
}

function buildWorkspaceDraftPayload({
  formState,
  source = "manual",
}) {
  return {
    form_state: cloneFormState(formState),
    source,
  };
}

const MODEL_MONITOR_REFRESH_MS = 5 * 60 * 1000;
const WORKSPACE_AUTOSAVE_MS = 30 * 1000;

export default function App() {
  const [activeBoard, setActiveBoard] = useState("greenfield");
  const [formState, setFormState] = useState(() => cloneFormState(INITIAL_FORM_STATE));
  const [existingResumeSourceText, setExistingResumeSourceText] = useState("");
  const [existingResumeSourceName, setExistingResumeSourceName] = useState("");
  const [existingJobInfo, setExistingJobInfo] = useState({
    target_company: "",
    target_role: "",
    job_requirements: "",
  });
  const [existingAdditionalAnswers, setExistingAdditionalAnswers] = useState([]);
  const [resumeTitle, setResumeTitle] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState([]);
  const [generationMode, setGenerationMode] = useState("fallback");
  const [memory, setMemory] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [statusText, setStatusText] = useState("正在连接本地后端并读取 memory.json ...");
  const [loadingAction, setLoadingAction] = useState("");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [questionFlowMode, setQuestionFlowMode] = useState("greenfield");
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [modelStatus, setModelStatus] = useState(null);
  const [modelStatusLoading, setModelStatusLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const lastSavedDraftHashRef = useRef("");
  const draftSaveInFlightRef = useRef(false);

  const loading = Boolean(loadingAction);

  async function refreshMemory() {
    const data = await fetchMemory();
    setMemory(data.memory);
  }

  function handleSwitchBoard(nextBoard) {
    if (nextBoard === activeBoard) return;

    setActiveBoard(nextBoard);
    setQuestionsOpen(false);
    setQuestions([]);
    setQuestionAnswers({});
    setQuestionFlowMode(nextBoard);
    setRevisionInstruction("");
    setStatusText(
      nextBoard === "existing_resume"
        ? "上传已有简历并填写岗位信息后，AI 会先按岗位优化，再针对缺失信息继续追问。"
        : "填写个人信息后点击“AI生成简历”，系统会先生成草稿，再追问缺失细节。",
    );
  }

  function createCurrentWorkspaceDraft(source = "manual") {
    return buildWorkspaceDraftPayload({
      formState,
      source,
    });
  }

  function restoreWorkspaceDraft(draft) {
    if (!draft) return;

    if (draft.form_state) {
      setFormState(cloneFormState(draft.form_state));
    }
  }

  async function persistWorkspaceDraft({ silent = false, source = "manual" } = {}) {
    if (backendStatus?.status !== "ok") {
      if (!silent) {
        setDraftSaveStatus("后端未连接，当前无法保存。");
      }
      return false;
    }

    if (draftSaveInFlightRef.current) {
      return false;
    }

    const payload = createCurrentWorkspaceDraft(source);
    const draftHash = JSON.stringify({ ...payload, source: undefined });
    const emptyHash = JSON.stringify({
      ...buildWorkspaceDraftPayload({
        formState: INITIAL_FORM_STATE,
      }),
      source: undefined,
    });

    if (draftHash === emptyHash) {
      if (!silent) {
        setDraftSaveStatus("当前还没有可保存的信息。");
      }
      return false;
    }

    if (draftHash === lastSavedDraftHashRef.current) {
      if (!silent) {
        setDraftSaveStatus("当前内容已经是最新保存版本。");
      }
      return false;
    }

    setDraftSaving(true);
    draftSaveInFlightRef.current = true;
    try {
      const result = await saveWorkspaceDraft(payload);
      lastSavedDraftHashRef.current = draftHash;
      const savedAt = result.saved_at ? new Date(result.saved_at).toLocaleTimeString() : "刚刚";
      setDraftSaveStatus(source === "autosave" ? `已自动保存 ${savedAt}` : `已手动保存 ${savedAt}`);
      if (!silent) {
        setStatusText("当前填写的个人信息已保存到本地。");
      }
      await refreshMemory();
      return true;
    } catch (error) {
      setDraftSaveStatus(`保存失败：${error.message}`);
      if (!silent) {
        setStatusText(`保存失败：${error.message}`);
      }
      return false;
    } finally {
      draftSaveInFlightRef.current = false;
      setDraftSaving(false);
    }
  }

  function applyModelStatus(result) {
    setModelStatus(result);
  }

  async function refreshModelStatus({ silent = false } = {}) {
    if (!silent) {
      setModelStatusLoading(true);
    }

    try {
      const result = await fetchModelStatus();
      applyModelStatus(result);
    } catch (error) {
      applyModelStatus({
        configured: backendStatus?.configured || false,
        reachable: false,
        status: "error",
        provider: backendStatus?.provider || "Unknown",
        model: backendStatus?.model || "Unknown",
        base_url: backendStatus?.base_url || "",
        wire_api: backendStatus?.wire_api || "",
        checked_at: new Date().toISOString(),
        latency_ms: null,
        sample_output: "",
        error: error.message,
      });
    } finally {
      if (!silent) {
        setModelStatusLoading(false);
      }
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const [health, memoryPayload] = await Promise.all([fetchHealth(), fetchMemory()]);
        setBackendStatus(health);
        setMemory(memoryPayload.memory);
        setStatusText("本地后端已连接，点击“AI生成简历”后会自动针对项目和实习经历发起追问。");

        const savedDraft = memoryPayload.memory?.workspace_draft;
        if (savedDraft) {
          restoreWorkspaceDraft(savedDraft);
          lastSavedDraftHashRef.current = JSON.stringify({
            ...buildWorkspaceDraftPayload({
              formState: savedDraft.form_state || INITIAL_FORM_STATE,
            }),
            source: undefined,
          });
          setDraftSaveStatus(
            savedDraft.saved_at
              ? `已恢复 ${new Date(savedDraft.saved_at).toLocaleString()} 保存的内容`
              : "已恢复上次保存的内容",
          );
          setStatusText("已恢复最近一次保存的个人信息备份。");
        } else {
          setDraftSaveStatus("个人信息支持手动保存，且会每 30 秒自动保存一次。");
        }

        try {
          const liveStatus = await fetchModelStatus();
          applyModelStatus(liveStatus);
        } catch (monitorError) {
          applyModelStatus({
            configured: health.configured || false,
            reachable: false,
            status: "error",
            provider: health.provider || "Unknown",
            model: health.model || "Unknown",
            base_url: health.base_url || "",
            wire_api: health.wire_api || "",
            checked_at: new Date().toISOString(),
            latency_ms: null,
            sample_output: "",
            error: monitorError.message,
          });
        }
      } catch (error) {
        setStatusText(`后端未连接：${error.message}。请先启动 FastAPI 服务。`);
      } finally {
        setWorkspaceReady(true);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!backendStatus) return undefined;

    const timer = window.setInterval(() => {
      void refreshModelStatus({ silent: true });
    }, MODEL_MONITOR_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [backendStatus]);

  useEffect(() => {
    if (!workspaceReady || backendStatus?.status !== "ok") return undefined;

    const timer = window.setInterval(() => {
      void persistWorkspaceDraft({ silent: true, source: "autosave" });
    }, WORKSPACE_AUTOSAVE_MS);

    return () => window.clearInterval(timer);
  }, [
    formState,
    backendStatus,
    workspaceReady,
  ]);

  function setQuestionDrafts(nextQuestions) {
    setQuestions(nextQuestions);
    setQuestionAnswers((previous) =>
      Object.fromEntries(nextQuestions.map((question) => [question, previous[question] || ""])),
    );
  }

  function applyResult(result, successMessage) {
    setResumeTitle(result.title || "简历草稿");
    setResumeText(normalizeResumeText(result.resume_text || ""));
    setAnalysisNotes(result.analysis_notes || []);
    setGenerationMode(result.mode || "fallback");
    if ((result.questions || []).length > 0) {
      setQuestionDrafts(result.questions);
    } else {
      setQuestions([]);
      setQuestionAnswers({});
      setQuestionsOpen(false);
    }
    setStatusText(successMessage);
  }

  async function generateWithCurrentState(nextFormState, sourceLabel = "简历生成完成") {
    const profile = buildProfilePayload(nextFormState);
    setLoadingAction("generate");

    try {
      const result = await generateResume({ profile });
      applyResult(
        result,
        result.needs_clarification
          ? "简历初稿已生成，同时发现项目或实习信息还不够具体，已弹出补充问题。"
          : `${sourceLabel}，你可以继续手动修改，或在左侧输入修订要求后发送给AI。`,
      );
      setQuestionFlowMode("greenfield");
      if (result.needs_clarification && (result.questions || []).length > 0) {
        setQuestionsOpen(true);
      }
      await refreshMemory();
    } catch (error) {
      setStatusText(`生成失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  function updateBasicInfo(field, value) {
    setFormState((previous) => ({
      ...previous,
      basic_info: {
        ...previous.basic_info,
        [field]: value,
      },
    }));
  }

  function updateExistingJobInfo(field, value) {
    setExistingJobInfo((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateListItem(listKey, index, field, value) {
    setFormState((previous) => ({
      ...previous,
      [listKey]: previous[listKey].map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addListItem(listKey) {
    const emptyItem =
      listKey === "education"
        ? createEmptyEducation()
        : listKey === "projects"
          ? createEmptyProject()
          : createEmptyExperience();

    setFormState((previous) => ({
      ...previous,
      [listKey]: [...previous[listKey], emptyItem],
    }));
  }

  function removeListItem(listKey, index) {
    setFormState((previous) => ({
      ...previous,
      [listKey]: previous[listKey].filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function toggleModule(moduleName) {
    setFormState((previous) => ({
      ...previous,
      modules: previous.modules.includes(moduleName)
        ? previous.modules.filter((item) => item !== moduleName)
        : [...previous.modules, moduleName],
    }));
  }

  async function handleScopedUpload(listKey, index, selectedFiles, inputElement) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = Array.from(selectedFiles)[0];
    setLoadingAction("upload");
    try {
      const result = await uploadFiles([file]);
      const summary = result.files?.[0];
      if (!summary) {
        throw new Error("上传结果为空。");
      }

      setFormState((previous) => ({
        ...previous,
        [listKey]: previous[listKey].map((item, currentIndex) =>
          currentIndex === index
            ? {
                ...item,
                attachment_name: summary.original_name,
                attachment_context: summary.full_text || "",
                attachment_preview: summary.extracted_text_preview || "",
                attachment_file_type: summary.file_type || "",
                attachment_todo_notice: summary.todo_notice || "",
              }
            : item,
        ),
      }));
      setStatusText(`已把附件绑定到当前${listKey === "projects" ? "项目经历" : "实习经历"}。`);
      await refreshMemory();
    } catch (error) {
      setStatusText(`上传失败：${error.message}`);
    } finally {
      if (inputElement) inputElement.value = "";
      setLoadingAction("");
    }
  }

  async function handleExistingResumeUpload(selectedFiles, inputElement) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = Array.from(selectedFiles)[0];
    setLoadingAction("upload");
    try {
      const result = await uploadFiles([file]);
      const summary = result.files?.[0];
      const extractedText = summary?.full_text || result.combined_context || "";
      setExistingResumeSourceText(extractedText);
      setExistingResumeSourceName(summary?.original_name || file.name || "");
      setStatusText(`已上传简历 ${summary?.original_name || file.name}，可以继续补充岗位信息后让 AI 优化。`);
      await refreshMemory();
    } catch (error) {
      setStatusText(`上传简历失败：${error.message}`);
    } finally {
      if (inputElement) inputElement.value = "";
      setLoadingAction("");
    }
  }

  async function runExistingResumeOptimize({
    resumeTextInput = existingResumeSourceText,
    additionalAnswers = existingAdditionalAnswers,
    instruction = "",
    sourceLabel = "岗位优化完成",
  } = {}) {
    if (!resumeTextInput.trim()) {
      setStatusText("请先上传或粘贴你的现有简历。");
      return;
    }

    setLoadingAction("existing_optimize");
    try {
      const result = await optimizeExistingResume({
        resume_text: resumeTextInput,
        target_company: existingJobInfo.target_company,
        target_role: existingJobInfo.target_role,
        job_requirements: existingJobInfo.job_requirements,
        instruction,
        additional_answers: additionalAnswers,
      });
      applyResult(
        result,
        result.needs_clarification
          ? "岗位优化初稿已生成，同时发现还有几处信息需要你补充。"
          : `${sourceLabel}，你可以继续在左侧直接修改，或继续发送给AI。`,
      );
      setQuestionFlowMode("existing_resume");
      setExistingAdditionalAnswers(additionalAnswers);
      if (result.needs_clarification && (result.questions || []).length > 0) {
        setQuestionsOpen(true);
      }
      await refreshMemory();
    } catch (error) {
      setStatusText(`岗位优化失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSubmitQuestions() {
    const answeredQuestions = questions
      .map((question) => ({
        question,
        answer: questionAnswers[question] || "",
      }))
      .filter((item) => item.answer.trim());

    setQuestionsOpen(false);

    if (questionFlowMode === "existing_resume") {
      await runExistingResumeOptimize({
        additionalAnswers: answeredQuestions,
        sourceLabel: "已根据补充回答更新岗位优化版本",
      });
      return;
    }

    const nextFormState = {
      ...formState,
      additional_answers: answeredQuestions,
    };

    setFormState(nextFormState);
    await generateWithCurrentState(nextFormState, "已根据补充回答更新简历");
  }

  function handleSkipQuestions() {
    setQuestionsOpen(false);
    setStatusText("已跳过补充问题，保留当前草稿。你可以继续手动修改、导出，或之后重新生成。");
  }

  async function handleSaveWorkspace() {
    await persistWorkspaceDraft({ source: "manual" });
  }

  function handleClearGreenfieldInfo() {
    setFormState(cloneFormState(INITIAL_FORM_STATE));
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空当前个人信息输入。");
  }

  function handleClearExistingInfo() {
    setExistingResumeSourceText("");
    setExistingResumeSourceName("");
    setExistingJobInfo({
      target_company: "",
      target_role: "",
      job_requirements: "",
    });
    setExistingAdditionalAnswers([]);
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空当前岗位优化输入。");
  }

  function handleClearResume() {
    setResumeTitle("");
    setResumeText("");
    setAnalysisNotes([]);
    setRevisionInstruction("");
    setQuestions([]);
    setQuestionAnswers({});
    setQuestionsOpen(false);
    setStatusText("已清空当前简历工作区。");
  }

  function handleRestoreWorkspaceBackup() {
    const savedDraft = memory?.workspace_draft;
    if (!savedDraft?.form_state) {
      setStatusText("当前还没有可恢复的个人信息备份。");
      return;
    }

    restoreWorkspaceDraft(savedDraft);
    lastSavedDraftHashRef.current = JSON.stringify({
      ...buildWorkspaceDraftPayload({
        formState: savedDraft.form_state,
      }),
      source: undefined,
    });
    setDraftSaveStatus(
      savedDraft.saved_at
        ? `已恢复 ${new Date(savedDraft.saved_at).toLocaleString()} 保存的内容`
        : "已恢复最近一次保存的内容",
    );
    setStatusText("已恢复最近一次保存的个人信息备份。");
  }

  async function handleReviseWithAI() {
    if (!resumeText.trim()) {
      setStatusText("请先生成简历初稿，再发送给AI。");
      return;
    }

    setLoadingAction("revise");
    try {
      const result =
        activeBoard === "existing_resume"
          ? await optimizeExistingResume({
              resume_text: resumeText,
              target_company: existingJobInfo.target_company,
              target_role: existingJobInfo.target_role,
              job_requirements: existingJobInfo.job_requirements,
              instruction: revisionInstruction,
              additional_answers: existingAdditionalAnswers,
            })
          : await reviseResume({
              profile: buildProfilePayload(formState),
              resume_text: resumeText,
              instruction: revisionInstruction,
            });
      applyResult(result, "简历修订完成，左侧已更新为最新版本。");
      await refreshMemory();
    } catch (error) {
      setStatusText(`修订失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSaveManualEdit() {
    if (!resumeText.trim()) {
      setStatusText("当前没有可保存的简历内容。");
      return;
    }

    setLoadingAction("save");
    try {
      const snapshot = await saveResumeSnapshot({
        target_company:
          activeBoard === "existing_resume"
            ? existingJobInfo.target_company
            : formState.basic_info.target_company,
        target_role:
          activeBoard === "existing_resume"
            ? existingJobInfo.target_role
            : formState.basic_info.target_role,
        resume_text: resumeText,
        generation_mode: generationMode || "manual_preserve",
      });
      const snapshotTime = snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleString() : "刚刚";
      setStatusText(`已保存当前简历快照：${snapshotTime}`);
      await refreshMemory();
    } catch (error) {
      setStatusText(`保存失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  async function handleExport(format) {
    if (!resumeText.trim()) {
      setStatusText("请先生成或编辑一份简历，再执行导出。");
      return;
    }

    setLoadingAction("export");
    try {
      const fallbackExportTitle =
        activeBoard === "existing_resume"
          ? buildResumeSnapshotTitle(existingJobInfo.target_company, existingJobInfo.target_role)
          : buildResumeSnapshotTitle(formState.basic_info.target_company, formState.basic_info.target_role) ||
            formState.basic_info.name;
      const fileNameBase = slugifyFileName(resumeTitle || fallbackExportTitle || "resume");
      const { blob, fileName } = await exportResumeFile({
        resume_text: resumeText,
        file_name: fileNameBase,
        format,
      });
      downloadBlob(blob, fileName);
      setStatusText(`已导出 ${fileName}。`);
      await refreshMemory();
    } catch (error) {
      setStatusText(`导出失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  function handleRestoreSnapshot(snapshot) {
    const restoredText = normalizeResumeText(snapshot?.resume_text || "");
    if (!restoredText.trim()) {
      setStatusText("这条简历快照没有可恢复的内容。");
      return;
    }

    const company = snapshot?.target_company?.trim();
    const role = snapshot?.target_role?.trim();
    const restoredTitle =
      [company, role].filter(Boolean).join("｜") || role || company || "已恢复简历快照";

    setResumeTitle(restoredTitle);
    setResumeText(restoredText);
    setGenerationMode(snapshot.generation_mode || "fallback");
    setStatusText(`已恢复 ${new Date(snapshot.timestamp).toLocaleString()} 保存的简历快照。`);
  }

  function handleRedownloadExport(record) {
    if (!record?.resume_text) {
      setStatusText("这条导出记录来自旧版本，未保存完整正文，暂时无法重新下载。");
      return;
    }

    const mimeType =
      record.format === "txt" ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8";
    const fallbackExtension = record.format === "txt" ? "txt" : "md";
    const fileName = record.file_name || `resume.${fallbackExtension}`;
    const blob = new Blob([record.resume_text], { type: mimeType });
    downloadBlob(blob, fileName);
    setStatusText(`已重新下载 ${fileName}。`);
  }

  async function handleDeleteSnapshot(snapshot) {
    if (!snapshot?.timestamp) {
      setStatusText("这条简历快照缺少删除标识。");
      return;
    }

    try {
      const result = await deleteResumeSnapshot(snapshot.timestamp);
      if (!result.deleted) {
        setStatusText("没有找到要删除的简历快照。");
        return;
      }
      await refreshMemory();
      setStatusText("已删除这条简历快照。");
    } catch (error) {
      setStatusText(`删除快照失败：${error.message}`);
    }
  }

  const questionCardTitle =
    questionFlowMode === "existing_resume"
      ? "为了继续按岗位优化，还需要你补充几项信息"
      : "生成时发现这些信息还不够具体";
  const questionCardDescription =
    questionFlowMode === "existing_resume"
      ? "回答后，系统会继续围绕目标公司、目标岗位和招聘要求优化这份已有简历。"
      : "回答后，系统会再次生成简历，并把你的补充信息整合进去。";
  const questionCardPlaceholder =
    questionFlowMode === "existing_resume"
      ? "请输入与你的岗位匹配、项目成果、量化结果或相关经历有关的补充信息..."
      : "请输入这段经历更具体的职责、动作、结果或数据...";

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1580px]">
        <header className="mb-6 paper-panel px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.34em] text-[var(--accent)] uppercase">
                Local AI Resume Generator
              </p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-[var(--ink)]">
                本地 AI 驱动的个性化简历生成系统
              </h1>
              <p className="mt-3 max-w-3xl text-base text-[var(--muted)]">
                点击“AI生成简历”后，系统会先生成草稿，再根据项目经历和实习经历里缺失的具体信息发起追问。
                目前没有 API Key 也可以完整测试这套交互流程。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="chip">阶段：本地测试版</span>
              <span className="chip">{backendStatus?.ai_available ? "已接入 OpenAI" : "本地兜底模式"}</span>
              <span className="chip">
                最近启动：{memory?.last_started_at ? new Date(memory.last_started_at).toLocaleString() : "尚未记录"}
              </span>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSwitchBoard("greenfield")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeBoard === "greenfield"
                ? "bg-[var(--accent)] text-white"
                : "border border-slate-300 bg-white text-[var(--ink)] hover:bg-slate-50"
            }`}
          >
            没有简历，直接开荒
          </button>
          <button
            type="button"
            onClick={() => handleSwitchBoard("existing_resume")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeBoard === "existing_resume"
                ? "bg-[var(--accent)] text-white"
                : "border border-slate-300 bg-white text-[var(--ink)] hover:bg-slate-50"
            }`}
          >
            已有简历，按岗位优化
          </button>
        </div>

        <ModelMonitorCard
          backendStatus={backendStatus}
          monitorStatus={modelStatus}
          loading={modelStatusLoading}
          onRefresh={() => refreshModelStatus()}
        />

        <main className="mt-6 grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-6">
            <ResumePreview
              title={resumeTitle}
              resumeText={resumeText}
              onResumeChange={setResumeText}
              onSaveManualEdit={handleSaveManualEdit}
              onClearResume={handleClearResume}
              onExport={handleExport}
              generationMode={generationMode}
              analysisNotes={analysisNotes}
              loading={loading}
              revisionInstruction={revisionInstruction}
              onRevisionInstructionChange={setRevisionInstruction}
              onReviseWithAI={handleReviseWithAI}
            />
          </div>

          {activeBoard === "greenfield" ? (
            <UserFormPanel
              formState={formState}
              statusText={statusText}
              backendStatus={backendStatus}
              loading={loading}
              draftSaving={draftSaving}
              draftSaveStatus={draftSaveStatus}
              onSaveDraft={handleSaveWorkspace}
              onClearInfo={handleClearGreenfieldInfo}
              onRestoreBackup={handleRestoreWorkspaceBackup}
              hasSavedBackup={Boolean(memory?.workspace_draft?.form_state)}
              onBasicInfoChange={updateBasicInfo}
              onMembershipChange={(value) =>
                setFormState((previous) => ({
                  ...previous,
                  membership_level: value,
                }))
              }
              onToggleFullInformation={(checked) =>
                setFormState((previous) => ({
                  ...previous,
                  use_full_information: checked,
                }))
              }
              onSkillsTextChange={(value) =>
                setFormState((previous) => ({
                  ...previous,
                  skills_text: value,
                }))
              }
              onToggleModule={toggleModule}
              onUploadFiles={handleScopedUpload}
              onListItemChange={updateListItem}
              onAddListItem={addListItem}
              onRemoveListItem={removeListItem}
              onGenerate={() => generateWithCurrentState(formState, "简历初稿已生成")}
            />
          ) : (
            <ExistingResumePanel
              statusText={statusText}
              loading={loading}
              resumeSourceText={existingResumeSourceText}
              resumeSourceName={existingResumeSourceName}
              jobInfo={existingJobInfo}
              onResumeSourceChange={setExistingResumeSourceText}
              onJobInfoChange={updateExistingJobInfo}
              onUploadResumeFile={handleExistingResumeUpload}
              onGenerate={() => runExistingResumeOptimize()}
              onClearInfo={handleClearExistingInfo}
            />
          )}
        </main>

        <div className="mt-6">
          <HistoryCard
            memory={memory}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onRedownloadExport={handleRedownloadExport}
          />
        </div>
      </div>

      <QuestionCard
        open={questionsOpen}
        questions={questions}
        answers={questionAnswers}
        onAnswerChange={(question, value) =>
          setQuestionAnswers((previous) => ({
            ...previous,
            [question]: value,
          }))
        }
        onSubmit={handleSubmitQuestions}
        onSkip={handleSkipQuestions}
        onClose={() => setQuestionsOpen(false)}
        loading={loading}
        title={questionCardTitle}
        description={questionCardDescription}
        placeholder={questionCardPlaceholder}
      />
    </div>
  );
}
