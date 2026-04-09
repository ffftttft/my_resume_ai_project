import React, { useEffect, useRef, useState } from "react";

import {
  deleteExportRecord,
  deleteResumeSnapshot,
  deleteUploadedFileRecord,
  exportResumeFile,
  fetchHealth,
  fetchMemory,
  fetchModelStatus,
  generateResume,
  optimizeExistingResume,
  previewUploadedFile,
  reviseResume,
  resetAiSession,
  saveResumeSnapshot,
  saveWorkspaceDraft,
  uploadFiles,
} from "./api";
import ExistingResumePanel from "./components/ExistingResumePanel";
import ExistingResumePreview from "./components/ExistingResumePreview";
import GreenfieldResumePreview from "./components/GreenfieldResumePreview";
import HistoryCard from "./components/HistoryCard";
import ModeSelectionDialog from "./components/ModeSelectionDialog";
import QuestionCard from "./components/QuestionCard";
import RecordPreviewDialog from "./components/RecordPreviewDialog";
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

function createEmptyResumeWorkspace() {
  return {
    title: "",
    resume_text: "",
    analysis_notes: [],
    generation_mode: "fallback",
    revision_instruction: "",
  };
}

function createEmptyExistingResumeInput() {
  return {
    target_company: "",
    target_role: "",
    job_requirements: "",
    resume_source_text: "",
    resume_source_name: "",
    additional_answers: [],
  };
}

const MEMBERSHIP_LEVEL_LABELS = Object.freeze({
  basic: "普通用户",
  advanced: "高级用户",
});

const BILLING_MODE_LABELS = Object.freeze({
  usage: "按量付费",
  buyout: "买断付费",
});

const MOCK_ACCOUNT_ENTITLEMENTS = Object.freeze({
  membership_level: "advanced",
  balance: 128.6,
  points: 2480,
  billing_mode: "usage",
  supported_billing_modes: ["usage", "buyout"],
});

const BOARD_LABELS = Object.freeze({
  greenfield: "新建简历",
  existing_resume: "现有简历优化",
});

function withAssignedMembershipLevel(formState) {
  return {
    ...cloneFormState(formState),
    membership_level: MOCK_ACCOUNT_ENTITLEMENTS.membership_level,
  };
}

const INITIAL_GREENFIELD_FORM_STATE = {
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
  membership_level: MOCK_ACCOUNT_ENTITLEMENTS.membership_level,
  use_full_information: false,
  uploaded_context: "",
  additional_answers: [],
};

const MODEL_MONITOR_REFRESH_MS = 5 * 60 * 1000;
const WORKSPACE_AUTOSAVE_MS = 30 * 1000;

const REQUIRED_JOB_FIELD_LABELS = Object.freeze({
  target_company: "目标公司",
  target_role: "目标岗位",
  job_requirements: "岗位要求",
});

const GENERIC_JOB_INFO = Object.freeze({
  target_company: "通用公司",
  target_role: "通用岗位",
  job_requirements:
    "通用招聘要求：突出与目标岗位相关的通用技能、项目成果、量化结果、协作能力与学习能力。",
});

function splitTextList(text) {
  return (text || "")
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDuration(duration) {
  const cleaned = (duration || "").replace(/[—–~～]/g, "至");
  const [start = "", end = ""] = cleaned.split("至").map((item) => item.trim());
  return { start_date: start, end_date: end };
}

function hasContent(item) {
  return Object.values(item || {}).some((value) => typeof value === "string" && value.trim());
}

function countFilledItems(items) {
  return (items || []).filter(hasContent).length;
}

function toEducationPayload(items) {
  return (items || [])
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
  return (items || [])
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
  return (items || [])
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
  return [...(formState.projects || []), ...(formState.experiences || [])]
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
    additional_answers: (formState.additional_answers || []).filter((item) => item?.answer?.trim()),
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
  return [targetCompany?.trim(), targetRole?.trim()].filter(Boolean).join(" - ");
}

function buildWorkspaceDraftPayload({ formState, source = "manual" }) {
  return {
    form_state: cloneFormState(formState),
    source,
  };
}

function mergeAnswerLists(previousAnswers, nextAnswers) {
  const merged = new Map();

  [...(previousAnswers || []), ...(nextAnswers || [])].forEach((item) => {
    const question = item?.question?.trim();
    const answer = item?.answer?.trim();
    if (question && answer) {
      merged.set(question, { question, answer });
    }
  });

  return Array.from(merged.values());
}

function buildRecordPreviewState(overrides = {}) {
  return {
    open: false,
    title: "",
    content: "",
    note: "",
    kind: "",
    record: null,
    loading: false,
    ...overrides,
  };
}

function hasRequiredJobInfo(jobInfo) {
  return Object.keys(REQUIRED_JOB_FIELD_LABELS).every((field) => jobInfo?.[field]?.trim());
}

function getRequiredJobInfoError(jobInfo) {
  const missingEntry = Object.entries(REQUIRED_JOB_FIELD_LABELS).find(
    ([field]) => !jobInfo?.[field]?.trim(),
  );

  if (!missingEntry) {
    return "";
  }

  return `请先填写${missingEntry[1]}。如果只是先测试流程，也可以点击“套用通用岗位模板”。`;
}

function getBoardIntroStatus(board) {
  return board === "existing_resume"
    ? "上传现有简历并按目标岗位要求执行优化。"
    : "完善岗位信息与候选人资料后生成新简历。";
}

function buildQuestionCardCopy(mode) {
  if (mode === "existing_resume") {
    return {
      title: "为了继续按岗优化，还需要你补充几项信息",
      description: "补充回答后，系统会继续围绕目标岗位优化当前简历。",
      placeholder: "请输入与岗位匹配、项目成果、量化结果或相关经历有关的补充信息...",
    };
  }

  return {
    title: "为了继续生成新简历，还需要你补充几项信息",
    description: "补充回答后，系统会重新生成简历，并整合新增信息。",
    placeholder: "请输入更具体的职责、动作、结果或量化数据...",
  };
}

export default function App() {
  const [activeBoard, setActiveBoard] = useState("greenfield");
  const [activeInfoPage, setActiveInfoPage] = useState(null);
  const [modeDialogOpen, setModeDialogOpen] = useState(true);
  const [greenfieldFormState, setGreenfieldFormState] = useState(() =>
    cloneFormState(INITIAL_GREENFIELD_FORM_STATE),
  );
  const [existingFormState, setExistingFormState] = useState(() => createEmptyExistingResumeInput());
  const [greenfieldWorkspace, setGreenfieldWorkspace] = useState(() => createEmptyResumeWorkspace());
  const [existingResumeWorkspace, setExistingResumeWorkspace] = useState(() =>
    createEmptyResumeWorkspace(),
  );
  const [memory, setMemory] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [statusText, setStatusText] = useState("正在连接本地服务并加载工作区...");
  const [loadingAction, setLoadingAction] = useState("");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [questionFlowMode, setQuestionFlowMode] = useState("greenfield");
  const [modelStatus, setModelStatus] = useState(null);
  const [modelStatusLoading, setModelStatusLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState("");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [recordPreview, setRecordPreview] = useState(() => buildRecordPreviewState());
  const [sessionUsername, setSessionUsername] = useState("ft");

  const lastSavedDraftHashRef = useRef("");
  const draftSaveInFlightRef = useRef(false);

  const loading = Boolean(loadingAction);
  const greenfieldJobInfoReady = hasRequiredJobInfo(greenfieldFormState.basic_info);
  const existingJobInfoReady = hasRequiredJobInfo(existingFormState);
  const activeWorkspace =
    activeBoard === "existing_resume" ? existingResumeWorkspace : greenfieldWorkspace;
  const activeJobInfo =
    activeBoard === "existing_resume" ? existingFormState : greenfieldFormState.basic_info;

  async function refreshMemory() {
    const data = await fetchMemory();
    setMemory(data.memory);
  }

  function closeRecordPreview() {
    setRecordPreview(buildRecordPreviewState());
  }

  function updateWorkspace(board, updater) {
    if (board === "existing_resume") {
      setExistingResumeWorkspace((previous) =>
        typeof updater === "function" ? updater(previous) : updater,
      );
      return;
    }

    setGreenfieldWorkspace((previous) =>
      typeof updater === "function" ? updater(previous) : updater,
    );
  }

  function applyWorkspaceResult(board, result) {
    updateWorkspace(board, (previous) => ({
      ...previous,
      title:
        result.title || (board === "existing_resume" ? "优化版简历草稿" : "新建简历草稿"),
      resume_text: normalizeResumeText(result.resume_text || ""),
      analysis_notes: result.analysis_notes || [],
      generation_mode: result.mode || previous.generation_mode || "fallback",
    }));
  }

  function setQuestionDrafts(nextQuestions) {
    setQuestions(nextQuestions);
    setQuestionAnswers((previous) =>
      Object.fromEntries(nextQuestions.map((question) => [question, previous[question] || ""])),
    );
  }

  function applyResult(board, result, successMessage) {
    applyWorkspaceResult(board, result);
    if ((result.questions || []).length > 0) {
      setQuestionDrafts(result.questions);
    } else {
      setQuestions([]);
      setQuestionAnswers({});
      setQuestionsOpen(false);
    }
    setStatusText(successMessage);
  }

  function handleSwitchBoard(nextBoard) {
    if (nextBoard === activeBoard) return;

    setActiveBoard(nextBoard);
    setActiveInfoPage(null);
    setQuestionsOpen(false);
    closeRecordPreview();
    setStatusText(getBoardIntroStatus(nextBoard));
  }

  function handleModeSelection(nextBoard) {
    if (nextBoard !== activeBoard) {
      handleSwitchBoard(nextBoard);
    } else {
      setStatusText(getBoardIntroStatus(nextBoard));
    }

    setModeDialogOpen(false);
  }

  function handleOpenInfoPage(board = activeBoard) {
    setActiveBoard(board);
    setActiveInfoPage(board);
    setQuestionsOpen(false);
    closeRecordPreview();
  }

  function handleCloseInfoPage() {
    setActiveInfoPage(null);
  }

  function applyGenericJobInfo(board = activeBoard) {
    if (board === "existing_resume") {
      setExistingFormState((previous) => ({
        ...previous,
        ...GENERIC_JOB_INFO,
      }));
      setStatusText("已填入标准岗位模板，你仍可继续手动调整。");
      return;
    }

    setGreenfieldFormState((previous) => ({
      ...previous,
      basic_info: {
        ...previous.basic_info,
        ...GENERIC_JOB_INFO,
      },
    }));
    setStatusText("已填入标准岗位模板，你仍可继续手动调整。");
  }

  function createCurrentWorkspaceDraft(source = "manual") {
    return buildWorkspaceDraftPayload({
      formState: greenfieldFormState,
      source,
    });
  }

  function restoreWorkspaceDraft(draft) {
    if (!draft?.form_state) return;
    setGreenfieldFormState(withAssignedMembershipLevel(draft.form_state));
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
      ...buildWorkspaceDraftPayload({ formState: INITIAL_GREENFIELD_FORM_STATE }),
      source: undefined,
    });

    if (draftHash === emptyHash) {
      if (!silent) {
        setDraftSaveStatus("当前还没有可保存的资料。");
      }
      return false;
    }

    if (draftHash === lastSavedDraftHashRef.current) {
      if (!silent) {
        setDraftSaveStatus("当前资料已经是最新保存版本。");
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
        setStatusText("当前资料已保存到本地草稿。");
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
        const sessionPayload = await resetAiSession();
        setSessionUsername(sessionPayload.username || "ft");

        const [health, memoryPayload] = await Promise.all([fetchHealth(), fetchMemory()]);
        setBackendStatus(health);
        setMemory(memoryPayload.memory);
        setStatusText("本地服务已连接，当前工作区已就绪。");

        const savedDraft = memoryPayload.memory?.workspace_draft;
        if (savedDraft?.form_state) {
          const restoredDraftFormState = withAssignedMembershipLevel(savedDraft.form_state);
          restoreWorkspaceDraft(savedDraft);
          lastSavedDraftHashRef.current = JSON.stringify({
            ...buildWorkspaceDraftPayload({
              formState: restoredDraftFormState,
            }),
            source: undefined,
          });
          setDraftSaveStatus(
            savedDraft.saved_at
              ? `已恢复 ${new Date(savedDraft.saved_at).toLocaleString()} 保存的资料草稿`
              : "已恢复最近一次保存的资料草稿",
          );
        } else {
          setDraftSaveStatus("资料支持手动保存，并会每 30 秒自动保存一次。");
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
        setStatusText(`本地服务未连接：${error.message}。请先启动服务后再试。`);
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
  }, [backendStatus, greenfieldFormState, workspaceReady]);

  function updateGreenfieldBasicInfo(field, value) {
    setGreenfieldFormState((previous) => ({
      ...previous,
      basic_info: {
        ...previous.basic_info,
        [field]: value,
      },
    }));
  }

  function updateExistingField(field, value) {
    setExistingFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateGreenfieldListItem(listKey, index, field, value) {
    setGreenfieldFormState((previous) => ({
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

    setGreenfieldFormState((previous) => ({
      ...previous,
      [listKey]: [...previous[listKey], emptyItem],
    }));
  }

  function removeListItem(listKey, index) {
    setGreenfieldFormState((previous) => ({
      ...previous,
      [listKey]: previous[listKey].filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function toggleModule(moduleName) {
    setGreenfieldFormState((previous) => ({
      ...previous,
      modules: previous.modules.includes(moduleName)
        ? previous.modules.filter((item) => item !== moduleName)
        : [...previous.modules, moduleName],
    }));
  }

  async function generateWithCurrentState(nextFormState, sourceLabel = "简历生成完成") {
    const requiredJobInfoError = getRequiredJobInfoError(nextFormState.basic_info);
    if (requiredJobInfoError) {
      setStatusText(requiredJobInfoError);
      return;
    }

    setLoadingAction("generate");
    try {
      const result = await generateResume({
        profile: buildProfilePayload(nextFormState),
      });
      applyResult(
        "greenfield",
        result,
        result.needs_clarification
          ? "新建简历初稿已生成，仍有部分信息待补充。"
          : `${sourceLabel}，你可以继续手动修改，或补充修订要求后交给 AI。`,
      );
      setQuestionFlowMode("greenfield");
      setActiveInfoPage(null);
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

      setGreenfieldFormState((previous) => ({
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

      setStatusText(
        `已把附件绑定到${listKey === "projects" ? "当前项目经历" : "当前实习 / 工作经历"}。`,
      );
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
      setExistingFormState((previous) => ({
        ...previous,
        resume_source_text: extractedText,
        resume_source_name: summary?.original_name || file.name || "",
      }));
      setStatusText(`已上传简历 ${summary?.original_name || file.name}，现在可以开始优化。`);
      await refreshMemory();
    } catch (error) {
      setStatusText(`上传简历失败：${error.message}`);
    } finally {
      if (inputElement) inputElement.value = "";
      setLoadingAction("");
    }
  }

  async function runExistingResumeOptimize({
    resumeTextInput = existingFormState.resume_source_text,
    additionalAnswers = existingFormState.additional_answers,
    instruction = "",
    sourceLabel = "简历优化完成",
  } = {}) {
    const requiredJobInfoError = getRequiredJobInfoError(existingFormState);
    if (requiredJobInfoError) {
      setStatusText(requiredJobInfoError);
      return;
    }

    if (!resumeTextInput.trim()) {
      setStatusText("请先上传或粘贴你的现有简历。");
      return;
    }

    setLoadingAction("existing_optimize");
    try {
      const result = await optimizeExistingResume({
        resume_text: resumeTextInput,
        target_company: existingFormState.target_company,
        target_role: existingFormState.target_role,
        job_requirements: existingFormState.job_requirements,
        instruction,
        additional_answers: additionalAnswers,
      });
      applyResult(
        "existing_resume",
        result,
        result.needs_clarification
          ? "优化结果已生成，仍有部分信息待补充。"
          : `${sourceLabel}，你可以继续直接修改，或继续交给 AI。`,
      );
      setQuestionFlowMode("existing_resume");
      setExistingFormState((previous) => ({
        ...previous,
        additional_answers: additionalAnswers,
      }));
      setActiveInfoPage(null);
      if (result.needs_clarification && (result.questions || []).length > 0) {
        setQuestionsOpen(true);
      }
      await refreshMemory();
    } catch (error) {
      setStatusText(`简历优化失败：${error.message}`);
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
      const mergedAnswers = mergeAnswerLists(existingFormState.additional_answers, answeredQuestions);
      setExistingFormState((previous) => ({
        ...previous,
        additional_answers: mergedAnswers,
      }));
      await runExistingResumeOptimize({
        additionalAnswers: mergedAnswers,
        sourceLabel: "已根据补充回答更新优化结果",
      });
      return;
    }

    const nextFormState = {
      ...greenfieldFormState,
      additional_answers: mergeAnswerLists(greenfieldFormState.additional_answers, answeredQuestions),
    };

    setGreenfieldFormState(nextFormState);
    await generateWithCurrentState(nextFormState, "已根据补充回答更新简历");
  }

  function handleSkipQuestions() {
    setQuestionsOpen(false);
    setStatusText("已跳过补充问题，保留当前结果。你可以之后再继续追问。");
  }

  async function handleSaveWorkspace() {
    await persistWorkspaceDraft({ source: "manual" });
  }

  function handleClearGreenfieldInfo() {
    setGreenfieldFormState(cloneFormState(INITIAL_GREENFIELD_FORM_STATE));
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空新建简历资料页中的全部内容。");
  }

  function handleClearExistingInfo() {
    setExistingFormState(createEmptyExistingResumeInput());
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空现有简历优化资料页中的岗位信息、简历原文和补充回答。");
  }

  function handleClearResume() {
    updateWorkspace(activeBoard, createEmptyResumeWorkspace());
    setQuestions([]);
    setQuestionAnswers({});
    setQuestionsOpen(false);
    setStatusText(
      activeBoard === "existing_resume"
        ? "已清空当前优化结果。"
        : "已清空当前新建简历结果。",
    );
  }

  function handleRestoreWorkspaceBackup() {
    const savedDraft = memory?.workspace_draft;
    if (!savedDraft?.form_state) {
      setStatusText("当前还没有可恢复的资料草稿。");
      return;
    }

    restoreWorkspaceDraft(savedDraft);
    const restoredDraftFormState = withAssignedMembershipLevel(savedDraft.form_state);
    lastSavedDraftHashRef.current = JSON.stringify({
      ...buildWorkspaceDraftPayload({ formState: restoredDraftFormState }),
      source: undefined,
    });
    setDraftSaveStatus(
      savedDraft.saved_at
        ? `已恢复 ${new Date(savedDraft.saved_at).toLocaleString()} 保存的资料草稿`
        : "已恢复最近一次保存的资料草稿",
    );
    setStatusText("已恢复最近一次保存的资料草稿。");
  }

  async function handleReviseWithAI() {
    if (!activeWorkspace.resume_text.trim()) {
      setStatusText("请先生成一份简历或优化结果，再发给 AI。");
      return;
    }

    const requiredJobInfoError =
      activeBoard === "existing_resume"
        ? getRequiredJobInfoError(existingFormState)
        : getRequiredJobInfoError(greenfieldFormState.basic_info);
    if (requiredJobInfoError) {
      setStatusText(requiredJobInfoError);
      return;
    }

    setLoadingAction("revise");
    try {
      const result =
        activeBoard === "existing_resume"
          ? await optimizeExistingResume({
              resume_text: activeWorkspace.resume_text,
              target_company: existingFormState.target_company,
              target_role: existingFormState.target_role,
              job_requirements: existingFormState.job_requirements,
              instruction: activeWorkspace.revision_instruction,
              additional_answers: existingFormState.additional_answers,
            })
          : await reviseResume({
              profile: buildProfilePayload(greenfieldFormState),
              resume_text: activeWorkspace.resume_text,
              instruction: activeWorkspace.revision_instruction,
            });

      applyResult(
        activeBoard,
        result,
        activeBoard === "existing_resume"
          ? "优化版简历已更新为最新版本。"
          : "新建简历已更新为最新版本。",
      );
      await refreshMemory();
    } catch (error) {
      setStatusText(`修订失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSaveManualEdit() {
    if (!activeWorkspace.resume_text.trim()) {
      setStatusText("当前没有可保存的简历内容。");
      return;
    }

    setLoadingAction("save");
    try {
      const snapshot = await saveResumeSnapshot({
        target_company: activeJobInfo.target_company,
        target_role: activeJobInfo.target_role,
        resume_text: activeWorkspace.resume_text,
        generation_mode: activeWorkspace.generation_mode || "manual_preserve",
      });
      const snapshotTime = snapshot.timestamp ? new Date(snapshot.timestamp).toLocaleString() : "刚刚";
      setStatusText(
        activeBoard === "existing_resume"
          ? `已保存当前优化结果快照：${snapshotTime}`
          : `已保存当前简历快照：${snapshotTime}`,
      );
      await refreshMemory();
    } catch (error) {
      setStatusText(`保存失败：${error.message}`);
    } finally {
      setLoadingAction("");
    }
  }

  async function handleExport(format) {
    if (!activeWorkspace.resume_text.trim()) {
      setStatusText("请先生成或编辑一份简历，再执行导出。");
      return;
    }

    setLoadingAction("export");
    try {
      const fallbackExportTitle =
        activeBoard === "existing_resume"
          ? buildResumeSnapshotTitle(existingFormState.target_company, existingFormState.target_role) ||
            "优化版简历"
          : buildResumeSnapshotTitle(
              greenfieldFormState.basic_info.target_company,
              greenfieldFormState.basic_info.target_role,
            ) ||
            greenfieldFormState.basic_info.name ||
            "新建简历";

      const fileNameBase = slugifyFileName(activeWorkspace.title || fallbackExportTitle || "resume");
      const { blob, fileName } = await exportResumeFile({
        resume_text: activeWorkspace.resume_text,
        file_name: fileNameBase,
        format,
      });
      downloadBlob(blob, fileName);
      setStatusText(
        activeBoard === "existing_resume"
          ? `已导出优化版简历：${fileName}`
          : `已导出简历：${fileName}`,
      );
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
      [company, role].filter(Boolean).join(" - ") || role || company || "已恢复简历快照";

    updateWorkspace(activeBoard, (previous) => ({
      ...previous,
      title: restoredTitle,
      resume_text: restoredText,
      generation_mode: snapshot.generation_mode || "fallback",
    }));

    setStatusText(
      activeBoard === "existing_resume"
        ? `已恢复 ${new Date(snapshot.timestamp).toLocaleString()} 保存的优化结果快照。`
        : `已恢复 ${new Date(snapshot.timestamp).toLocaleString()} 保存的简历快照。`,
    );
  }

  function handleRedownloadExport(record) {
    if (!record?.resume_text) {
      setStatusText("这条导出记录缺少正文内容，暂时无法重新下载。");
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

  async function handlePreviewUpload(record) {
    if (!record?.saved_name) {
      setStatusText("这条上传记录缺少可预览的文件标识。");
      return;
    }

    setRecordPreview(
      buildRecordPreviewState({
        open: true,
        title: record.original_name || "上传记录预览",
        note: "正在重新提取上传文件内容。",
        kind: "upload",
        record,
        loading: true,
      }),
    );

    try {
      const preview = await previewUploadedFile(record.saved_name);
      setRecordPreview(
        buildRecordPreviewState({
          open: true,
          title: record.original_name || preview.saved_name || "上传记录预览",
          content: preview.full_text || preview.extracted_text_preview || "",
          note:
            preview.todo_notice ||
            (preview.file_type ? `文件类型：${preview.file_type}` : "已提取本地上传记录内容。"),
          kind: "upload",
          record,
          loading: false,
        }),
      );
    } catch (error) {
      closeRecordPreview();
      setStatusText(`预览上传记录失败：${error.message}`);
    }
  }

  function handlePreviewExport(record) {
    setRecordPreview(
      buildRecordPreviewState({
        open: true,
        title: record?.file_name || "导出记录预览",
        content: record?.resume_text || "",
        note: record?.resume_text
          ? `格式：${record?.format?.toUpperCase?.() || "未知"}`
          : "这条导出记录缺少正文内容，暂时无法网页预览。",
        kind: "export",
        record,
        loading: false,
      }),
    );
  }

  async function handleDeleteUpload(record) {
    if (!record?.saved_name && !record?.timestamp) {
      setStatusText("这条上传记录缺少删除标识。");
      return;
    }

    try {
      const result = await deleteUploadedFileRecord({
        saved_name: record.saved_name || "",
        timestamp: record.timestamp || "",
      });
      if (!result.deleted) {
        setStatusText("没有找到要删除的上传记录。");
        return;
      }

      if (
        recordPreview.open &&
        recordPreview.kind === "upload" &&
        (recordPreview.record?.saved_name === record.saved_name ||
          recordPreview.record?.timestamp === record.timestamp)
      ) {
        closeRecordPreview();
      }

      await refreshMemory();
      setStatusText("已删除这条上传记录。");
    } catch (error) {
      setStatusText(`删除上传记录失败：${error.message}`);
    }
  }

  async function handleDeleteExport(record) {
    if (!record?.file_name && !record?.timestamp) {
      setStatusText("这条导出记录缺少删除标识。");
      return;
    }

    try {
      const result = await deleteExportRecord({
        file_name: record.file_name || "",
        timestamp: record.timestamp || "",
      });
      if (!result.deleted) {
        setStatusText("没有找到要删除的导出记录。");
        return;
      }

      if (
        recordPreview.open &&
        recordPreview.kind === "export" &&
        (recordPreview.record?.file_name === record.file_name ||
          recordPreview.record?.timestamp === record.timestamp)
      ) {
        closeRecordPreview();
      }

      await refreshMemory();
      setStatusText("已删除这条导出记录。");
    } catch (error) {
      setStatusText(`删除导出记录失败：${error.message}`);
    }
  }

  const questionCardCopy = buildQuestionCardCopy(questionFlowMode);
  const currentModeLabel = BOARD_LABELS[activeBoard] || BOARD_LABELS.greenfield;
  const currentModelLabel = modelStatus?.model || backendStatus?.model || "未配置";
  const modelLatencyLabel =
    typeof modelStatus?.latency_ms === "number" ? `${modelStatus.latency_ms} ms` : "未返回";
  const modelCheckedLabel = modelStatus?.checked_at
    ? new Date(modelStatus.checked_at).toLocaleTimeString()
    : "未检测";
  const lastStartedLabel = memory?.last_started_at
    ? new Date(memory.last_started_at).toLocaleString()
    : "尚未记录";
  const backendSummaryLabel = backendStatus?.status === "ok" ? "服务在线" : "服务待连接";
  const aiSummaryLabel = backendStatus?.ai_available ? "AI 服务可用" : "本地生成模式";
  const modelAvailability = Boolean(modelStatus?.reachable);
  const modelTestLabel = modelStatusLoading ? "测试中..." : "手动测试";
  const modelCardMeta = `延迟 ${modelLatencyLabel} · 最近检测 ${modelCheckedLabel}`;

  const hasPendingQuestionsForActiveBoard =
    questions.length > 0 && questionFlowMode === activeBoard;
  const greenfieldProfileFieldCount = [
    greenfieldFormState.basic_info.name,
    greenfieldFormState.basic_info.email,
    greenfieldFormState.basic_info.phone,
    greenfieldFormState.basic_info.city,
    greenfieldFormState.basic_info.summary,
    greenfieldFormState.skills_text,
  ].filter((value) => value.trim()).length;
  const greenfieldStructuredCount =
    countFilledItems(greenfieldFormState.education) +
    countFilledItems(greenfieldFormState.projects) +
    countFilledItems(greenfieldFormState.experiences);
  const greenfieldAttachmentCount = [
    ...greenfieldFormState.projects,
    ...greenfieldFormState.experiences,
  ].filter((item) => item.attachment_name).length;
  const existingResumeReady = Boolean(existingFormState.resume_source_text.trim());
  const existingAnswerCount = existingFormState.additional_answers.length;
  const accountMembershipLabel =
    MEMBERSHIP_LEVEL_LABELS[greenfieldFormState.membership_level] || "高级用户";
  const accountBalanceLabel = `¥ ${MOCK_ACCOUNT_ENTITLEMENTS.balance.toFixed(2)}`;
  const accountPointsLabel = MOCK_ACCOUNT_ENTITLEMENTS.points.toLocaleString("zh-CN");
  const currentBillingModeLabel =
    BILLING_MODE_LABELS[MOCK_ACCOUNT_ENTITLEMENTS.billing_mode] || "按量付费";
  const supportedBillingModeLabels = MOCK_ACCOUNT_ENTITLEMENTS.supported_billing_modes.map(
    (mode) => BILLING_MODE_LABELS[mode] || mode,
  );

  const workspaceEntryTitle =
    activeBoard === "existing_resume" ? "优化资料录入" : "新建简历资料录入";
  const workspaceEntryDescription =
    activeBoard === "existing_resume"
      ? "请先进入资料录入页，完善岗位信息并上传现有简历后再执行优化。"
      : "请先进入资料录入页，完善岗位信息与候选人资料后再生成简历。";
  const workspaceEntryButtonLabel = "进入资料录入";
  const greenfieldReadiness = Math.min(
    100,
    Math.round(
      (greenfieldJobInfoReady ? 38 : 0) +
        (Math.min(greenfieldProfileFieldCount, 6) / 6) * 24 +
        (Math.min(greenfieldStructuredCount, 3) / 3) * 26 +
        (Math.min(greenfieldAttachmentCount, 2) / 2) * 12,
    ),
  );
  const existingReadiness = Math.min(
    100,
    Math.round(
      (existingJobInfoReady ? 45 : 0) +
        (existingResumeReady ? 40 : 0) +
        (Math.min(existingAnswerCount, 2) / 2) * 15,
    ),
  );
  const activeReadiness =
    activeBoard === "existing_resume" ? existingReadiness : greenfieldReadiness;
  const activeReadinessTone =
    activeReadiness >= 80 ? "可执行" : activeReadiness >= 50 ? "准备中" : "待整理";
  const activeReadinessDescription =
    activeBoard === "existing_resume"
      ? "岗位锚点与原始简历越完整，优化结果越接近目标职位。"
      : "岗位信息、候选人素材和附件上下文越完整，生成草稿越稳。";
  const activeFlowSteps =
    activeBoard === "existing_resume"
      ? [
          {
            index: "01",
            title: "锁定岗位锚点",
            detail: "公司、岗位与 JD 会作为整轮优化的判断基准。",
          },
          {
            index: "02",
            title: "导入现有简历",
            detail: "支持上传文件或直接粘贴正文，保留原始表达供对照。",
          },
          {
            index: "03",
            title: "定向优化留档",
            detail: "生成后继续修订、追问与导出，所有版本都能在历史区回看。",
          },
        ]
      : [
          {
            index: "01",
            title: "定义目标岗位",
            detail: "目标公司、岗位名称和要求决定生成方向与措辞重点。",
          },
          {
            index: "02",
            title: "整理候选人素材",
            detail: "填入经历、项目、技能与附件上下文，给 AI 足够的真实材料。",
          },
          {
            index: "03",
            title: "生成草稿迭代",
            detail: "先出第一版，再继续人工修改、AI 修订和版本保存。",
          },
        ];
  const entryCheckpoints =
    activeBoard === "existing_resume"
      ? [
          {
            label: "岗位锚点",
            value: existingJobInfoReady ? "已锁定" : "待完善",
            meta: existingJobInfoReady
              ? "目标公司、岗位和要求已经具备。"
              : "先补齐目标公司、岗位名称与 JD。",
            done: existingJobInfoReady,
          },
          {
            label: "原始简历",
            value: existingResumeReady ? "已导入" : "待导入",
            meta: existingResumeReady
              ? existingFormState.resume_source_name || "正文已录入，可以直接开始优化。"
              : "上传文件或粘贴正文，作为优化基底。",
            done: existingResumeReady,
          },
          {
            label: "追问补充",
            value:
              existingAnswerCount > 0
                ? `${existingAnswerCount} 条已补充`
                : hasPendingQuestionsForActiveBoard
                  ? "有待处理追问"
                  : "当前无需补充",
            meta: hasPendingQuestionsForActiveBoard
              ? "补完追问后再生成，岗位匹配会更稳。"
              : "当前没有额外追问阻塞。",
            done: existingAnswerCount > 0 || !hasPendingQuestionsForActiveBoard,
          },
        ]
      : [
          {
            label: "岗位锚点",
            value: greenfieldJobInfoReady ? "已锁定" : "待完善",
            meta: greenfieldJobInfoReady
              ? "当前岗位目标已经明确。"
              : "先明确目标公司、岗位与 JD。",
            done: greenfieldJobInfoReady,
          },
          {
            label: "候选人素材",
            value:
              greenfieldProfileFieldCount + greenfieldStructuredCount > 0
                ? `${greenfieldProfileFieldCount + greenfieldStructuredCount} 项已整理`
                : "待填写",
            meta:
              greenfieldProfileFieldCount + greenfieldStructuredCount > 0
                ? "基础信息、经历与项目已经开始成形。"
                : "姓名、摘要、技能、经历和项目至少先补一轮。",
            done: greenfieldProfileFieldCount + greenfieldStructuredCount > 0,
          },
          {
            label: "附件上下文",
            value: greenfieldAttachmentCount > 0 ? "已增强" : "可选增强项",
            meta:
              greenfieldAttachmentCount > 0
                ? `${greenfieldAttachmentCount} 个附件已关联到项目或经历。`
                : "附件不是必填，但能帮助 AI 提炼真实细节。",
            done: greenfieldAttachmentCount > 0,
          },
        ];

  return (
    <div className="app-shell min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-[1580px] dashboard-grid">
        <header className="dashboard-hero">
          <div className="dashboard-hero__intro">
            <span className="dashboard-badge">Career Atelier</span>
            <h1 className="dashboard-title">智能简历工作台</h1>
            <p className="dashboard-description">
              像整理一份候选人档案一样围绕目标岗位生成或优化简历，在工作台中持续查看正文结果，并进入资料录入与留档。
            </p>

            <div className="dashboard-ledger" aria-label="当前工作流步骤">
              {activeFlowSteps.map((step) => (
                <div key={step.index} className="dashboard-ledger__item">
                  <span className="dashboard-ledger__index">{step.index}</span>
                  <div>
                    <p className="dashboard-ledger__title">{step.title}</p>
                    <p className="dashboard-ledger__meta">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <section className="dashboard-readiness" aria-label="资料准备度">
              <div className="dashboard-readiness__head">
                <div>
                  <p className="dashboard-readiness__label">资料准备度</p>
                  <p className="dashboard-readiness__meta">{activeReadinessDescription}</p>
                </div>
                <div className="dashboard-readiness__score">
                  <strong>{activeReadiness}%</strong>
                  <span>{activeReadinessTone}</span>
                </div>
              </div>
              <div className="dashboard-readiness__track" aria-hidden="true">
                <span
                  className="dashboard-readiness__fill"
                  style={{ width: `${activeReadiness}%` }}
                />
              </div>
            </section>

            <div className="dashboard-hero__actions">
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip accent-chip">{backendSummaryLabel}</span>
                <span className="chip">{aiSummaryLabel}</span>
                <span className="chip">最近启动：{lastStartedLabel}</span>
                <span className="chip">
                  当前追问：{hasPendingQuestionsForActiveBoard ? questions.length : 0}
                </span>
              </div>

              <div className="mode-switch">
                <button
                  type="button"
                  onClick={() => handleSwitchBoard("greenfield")}
                  className={`mode-switch__button ${activeBoard === "greenfield" ? "is-active" : ""}`}
                >
                  <span className="mode-switch__title">新建简历</span>
                  <span className="mode-switch__meta">录入岗位需求与候选人资料，生成初版简历。</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchBoard("existing_resume")}
                  className={`mode-switch__button ${activeBoard === "existing_resume" ? "is-active" : ""}`}
                >
                  <span className="mode-switch__title">现有简历优化</span>
                  <span className="mode-switch__meta">上传现有简历，围绕目标岗位要求定向优化。</span>
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-metrics">
            <div className="dashboard-stat dashboard-stat--flow">
              <div>
                <p className="dashboard-stat__label">当前工作流</p>
                <p className="dashboard-stat__value">{currentModeLabel}</p>
              </div>
              <p className="dashboard-stat__meta">{getBoardIntroStatus(activeBoard)}</p>
            </div>

            <div className="dashboard-stat dashboard-stat--account">
              <div>
                <p className="dashboard-stat__label">账户权益</p>
                <div className="dashboard-account-grid">
                  <div>
                    <p className="dashboard-stat__label">用户名</p>
                    <p className="dashboard-stat__value dashboard-stat__value--accent">
                      {sessionUsername}
                    </p>
                  </div>
                  <div>
                    <p className="dashboard-stat__label">本地记忆</p>
                    <p className="dashboard-stat__value dashboard-stat__value--accent">
                      {memory ? "已加载" : "等待加载"}
                    </p>
                  </div>
                </div>

                <div className="dashboard-rights-grid">
                  <div className="dashboard-rights-tile">
                    <p className="dashboard-stat__label">余额</p>
                    <p className="dashboard-rights-tile__value">{accountBalanceLabel}</p>
                    <p className="dashboard-rights-tile__hint">用于按量付费</p>
                  </div>
                  <div className="dashboard-rights-tile">
                    <p className="dashboard-stat__label">积分</p>
                    <p className="dashboard-rights-tile__value">{accountPointsLabel}</p>
                    <p className="dashboard-rights-tile__hint">可抵扣部分生成消耗</p>
                  </div>
                  <div className="dashboard-rights-tile">
                    <p className="dashboard-stat__label">用户等级</p>
                    <p className="dashboard-rights-tile__value">{accountMembershipLabel}</p>
                    <p className="dashboard-rights-tile__hint">由系统分配</p>
                  </div>
                  <div className="dashboard-rights-tile">
                    <p className="dashboard-stat__label">当前计费</p>
                    <p className="dashboard-rights-tile__value">{currentBillingModeLabel}</p>
                    <p className="dashboard-rights-tile__hint">后续支持买断付费</p>
                  </div>
                </div>

                <div className="dashboard-plan-pills">
                  {supportedBillingModeLabels.map((label) => (
                    <span
                      key={label}
                      className={`chip ${
                        label === currentBillingModeLabel ? "accent-chip" : ""
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="dashboard-stat dashboard-stat--model">
              <div>
                <p className="dashboard-stat__label">模型状态</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="dashboard-stat__value mt-0">{currentModelLabel}</p>
                  <span
                    className={`dashboard-status-pill ${
                      modelAvailability ? "is-available" : "is-unavailable"
                    }`}
                  >
                    <span className="dashboard-status-pill__dot" />
                    {modelAvailability ? "可用" : "不可用"}
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshModelStatus()}
                    disabled={modelStatusLoading}
                    className="mini-outline-button"
                  >
                    {modelTestLabel}
                  </button>
                </div>
              </div>
              <p className="dashboard-stat__meta">{modelCardMeta}</p>
            </div>
          </div>
        </header>

        <section className="paper-panel workspace-status-panel px-5 py-4">
          <div className="workspace-status-panel__head">
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
                工作状态
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">当前工作区</h2>
              <p
                aria-live="polite"
                className="mt-2 max-w-4xl text-sm leading-7 text-[var(--muted)]"
              >
                {statusText}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="chip">{draftSaveStatus || "资料支持自动保存"}</span>
              <span className="chip">{loading ? "当前有任务执行中" : "当前空闲，可继续操作"}</span>
            </div>
          </div>
        </section>

        {activeInfoPage ? (
          <section className="subpage-shell">
            {activeInfoPage === "greenfield" ? (
              <UserFormPanel
                jobInfo={greenfieldFormState.basic_info}
                formState={greenfieldFormState}
                statusText={statusText}
                loading={loading}
                jobInfoReady={greenfieldJobInfoReady}
                draftSaving={draftSaving}
                draftSaveStatus={draftSaveStatus}
                onSaveDraft={handleSaveWorkspace}
                onClearInfo={handleClearGreenfieldInfo}
                onRestoreBackup={handleRestoreWorkspaceBackup}
                hasSavedBackup={Boolean(memory?.workspace_draft?.form_state)}
                onJobFieldChange={updateGreenfieldBasicInfo}
                onApplyGenericJobInfo={() => applyGenericJobInfo("greenfield")}
                onBasicInfoChange={updateGreenfieldBasicInfo}
                onToggleFullInformation={(checked) =>
                  setGreenfieldFormState((previous) => ({
                    ...previous,
                    use_full_information: checked,
                  }))
                }
                onSkillsTextChange={(value) =>
                  setGreenfieldFormState((previous) => ({
                    ...previous,
                    skills_text: value,
                  }))
                }
                onToggleModule={toggleModule}
                onUploadFiles={handleScopedUpload}
                onListItemChange={updateGreenfieldListItem}
                onAddListItem={addListItem}
                onRemoveListItem={removeListItem}
                onGenerate={() => generateWithCurrentState(greenfieldFormState, "简历初稿已生成")}
                onBack={handleCloseInfoPage}
                hasPendingQuestions={hasPendingQuestionsForActiveBoard}
                onOpenQuestions={() => setQuestionsOpen(true)}
              />
            ) : (
              <ExistingResumePanel
                jobInfo={existingFormState}
                onJobFieldChange={updateExistingField}
                onApplyGenericJobInfo={() => applyGenericJobInfo("existing_resume")}
                statusText={statusText}
                loading={loading}
                jobInfoReady={existingJobInfoReady}
                resumeSourceText={existingFormState.resume_source_text}
                resumeSourceName={existingFormState.resume_source_name}
                additionalAnswerCount={existingAnswerCount}
                onResumeSourceChange={(value) => updateExistingField("resume_source_text", value)}
                onUploadResumeFile={handleExistingResumeUpload}
                onGenerate={() => runExistingResumeOptimize()}
                onClearInfo={handleClearExistingInfo}
                onBack={handleCloseInfoPage}
                hasPendingQuestions={hasPendingQuestionsForActiveBoard}
                onOpenQuestions={() => setQuestionsOpen(true)}
              />
            )}
          </section>
        ) : (
          <>
            <main className="workspace-shell">
              <div className="min-h-0">
                {activeBoard === "existing_resume" ? (
                  <ExistingResumePreview
                    title={existingResumeWorkspace.title}
                    resumeText={existingResumeWorkspace.resume_text}
                    onResumeChange={(value) =>
                      updateWorkspace("existing_resume", (previous) => ({
                        ...previous,
                        resume_text: value,
                      }))
                    }
                    onSaveManualEdit={handleSaveManualEdit}
                    onClearResume={handleClearResume}
                    onExport={handleExport}
                    generationMode={existingResumeWorkspace.generation_mode}
                    analysisNotes={existingResumeWorkspace.analysis_notes}
                    loading={loading}
                    revisionInstruction={existingResumeWorkspace.revision_instruction}
                    onRevisionInstructionChange={(value) =>
                      updateWorkspace("existing_resume", (previous) => ({
                        ...previous,
                        revision_instruction: value,
                      }))
                    }
                    onReviseWithAI={handleReviseWithAI}
                  />
                ) : (
                  <GreenfieldResumePreview
                    title={greenfieldWorkspace.title}
                    resumeText={greenfieldWorkspace.resume_text}
                    onResumeChange={(value) =>
                      updateWorkspace("greenfield", (previous) => ({
                        ...previous,
                        resume_text: value,
                      }))
                    }
                    onSaveManualEdit={handleSaveManualEdit}
                    onClearResume={handleClearResume}
                    onExport={handleExport}
                    generationMode={greenfieldWorkspace.generation_mode}
                    analysisNotes={greenfieldWorkspace.analysis_notes}
                    loading={loading}
                    revisionInstruction={greenfieldWorkspace.revision_instruction}
                    onRevisionInstructionChange={(value) =>
                      updateWorkspace("greenfield", (previous) => ({
                        ...previous,
                        revision_instruction: value,
                      }))
                    }
                    onReviseWithAI={handleReviseWithAI}
                  />
                )}
              </div>

              <aside className="workspace-rail">
                <section className="paper-panel workspace-entry-card p-6 lg:p-7">
                  <div className="workspace-entry-card__header">
                    <div>
                      <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
                        资料录入
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">
                        {workspaceEntryTitle}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        {workspaceEntryDescription}
                      </p>
                    </div>
                    <span className="chip accent-chip">{currentModeLabel}</span>
                  </div>

                  <div className="entry-metric-grid">
                    {activeBoard === "existing_resume" ? (
                      <>
                        <div className="entry-metric">
                          <span className="entry-metric__label">岗位信息</span>
                          <strong className="entry-metric__value">
                            {existingJobInfoReady ? "已完成" : "待填写"}
                          </strong>
                        </div>
                        <div className="entry-metric">
                          <span className="entry-metric__label">原始简历</span>
                          <strong className="entry-metric__value">
                            {existingResumeReady ? "已准备" : "未准备"}
                          </strong>
                        </div>
                        <div className="entry-metric">
                          <span className="entry-metric__label">补充回答</span>
                          <strong className="entry-metric__value">{existingAnswerCount}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="entry-metric">
                          <span className="entry-metric__label">岗位信息</span>
                          <strong className="entry-metric__value">
                            {greenfieldJobInfoReady ? "已完成" : "待填写"}
                          </strong>
                        </div>
                        <div className="entry-metric">
                          <span className="entry-metric__label">候选人素材</span>
                          <strong className="entry-metric__value">
                            {greenfieldProfileFieldCount + greenfieldStructuredCount}
                          </strong>
                        </div>
                        <div className="entry-metric">
                          <span className="entry-metric__label">关联附件</span>
                          <strong className="entry-metric__value">{greenfieldAttachmentCount}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="workspace-entry-card__progress">
                    <div className="workspace-entry-card__progress-head">
                      <div>
                        <p className="entry-metric__label">当前准备度</p>
                        <p className="workspace-entry-card__progress-copy">
                          {activeReadinessDescription}
                        </p>
                      </div>
                      <strong className="workspace-entry-card__progress-score">
                        {activeReadiness}% · {activeReadinessTone}
                      </strong>
                    </div>

                    <div className="workspace-entry-card__progress-track" aria-hidden="true">
                      <span
                        className="workspace-entry-card__progress-fill"
                        style={{ width: `${activeReadiness}%` }}
                      />
                    </div>
                  </div>

                  <div className="entry-checkpoint-grid">
                    {entryCheckpoints.map((checkpoint) => (
                      <div
                        key={checkpoint.label}
                        className={`entry-checkpoint ${checkpoint.done ? "is-complete" : ""}`}
                      >
                        <span className="entry-checkpoint__label">{checkpoint.label}</span>
                        <strong className="entry-checkpoint__value">{checkpoint.value}</strong>
                        <p className="entry-checkpoint__meta">{checkpoint.meta}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenInfoPage(activeBoard)}
                      className="pill-button pill-button--primary"
                    >
                      {workspaceEntryButtonLabel}
                    </button>
                    {hasPendingQuestionsForActiveBoard ? (
                      <button
                        type="button"
                        onClick={() => setQuestionsOpen(true)}
                        className="pill-button pill-button--ghost"
                      >
                        继续回答追问
                      </button>
                    ) : null}
                  </div>
                </section>
              </aside>
            </main>

            <HistoryCard
              memory={memory}
              onRestoreSnapshot={handleRestoreSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              onPreviewUpload={handlePreviewUpload}
              onDeleteUpload={handleDeleteUpload}
              onPreviewExport={handlePreviewExport}
              onRedownloadExport={handleRedownloadExport}
              onDeleteExport={handleDeleteExport}
            />
          </>
        )}
      </div>

      <ModeSelectionDialog
        open={modeDialogOpen}
        activeBoard={activeBoard}
        username={sessionUsername}
        onSelect={handleModeSelection}
      />

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
        title={questionCardCopy.title}
        description={questionCardCopy.description}
        placeholder={questionCardCopy.placeholder}
      />

      <RecordPreviewDialog
        open={recordPreview.open}
        title={recordPreview.title}
        content={recordPreview.content}
        note={recordPreview.note}
        loading={recordPreview.loading}
        onClose={closeRecordPreview}
        onDownload={
          recordPreview.kind === "export" && recordPreview.record?.resume_text
            ? () => handleRedownloadExport(recordPreview.record)
            : undefined
        }
      />
    </div>
  );
}
