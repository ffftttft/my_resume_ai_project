import React, { useEffect, useRef, useState } from "react";

import {
  deleteExportRecord,
  deleteResumeSnapshot,
  deleteUploadedFileRecord,
  exportResumeFile,
  fetchHealth,
  fetchMemory,
  fetchModelStatus,
  optimizeExistingResume,
  previewUploadedFile,
  reviseResume,
  resetAiSession,
  saveResumeSnapshot,
  searchJobContext,
  searchRagReferences,
  scoreSemanticAts,
  saveWorkspaceDraft,
  uploadFiles,
} from "./api";
import {
  generateGreenfieldResumeStream,
  generateResumeStream,
} from "./lib/ai-service";
import AtsDashboard from "./components/AtsDashboard";
import AiProgressTimeline from "./components/AiProgressTimeline";
import DraftLabPanel from "./components/DraftLabPanel";
import EditAnchorNav from "./components/EditAnchorNav";
import ExistingResumePanel from "./components/ExistingResumePanel";
import JobInsightDrawer from "./components/JobInsightDrawer";
import LiveJsonModal from "./components/LiveJsonModal";
import ModeSelectionDialog from "./components/ModeSelectionDialog";
import QuestionCard from "./components/QuestionCard";
import RecordPreviewDialog from "./components/RecordPreviewDialog";
import ResumeWorkbenchPreview from "./components/ResumeWorkbenchPreview";
import UserFormPanel from "./components/UserFormPanel";
import WorkspaceHistoryDrawer from "./components/WorkspaceHistoryDrawer";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import { calculateATSScore } from "./lib/ats-scorer";
import { normalizeMonthInput } from "./lib/date-utils";
import { renderStructuredResumeMarkdown } from "./lib/resume-renderer";
import { normalizeResumeText } from "./lib/resume-text";

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
    structured_resume: null,
    contract_report: null,
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

function createEmptyLiveStreamState() {
  return {
    board: "",
    active: false,
    status: "",
    phase: "",
    step: 0,
    totalSteps: 0,
    meta: null,
    partial_result: null,
    raw_json: "",
    error: "",
  };
}

function getPhaseLabel(phase) {
  const phaseMap = {
    search: "正在联网搜索岗位信息",
    synthesize: "正在提炼岗位关键词",
    draft: "正在生成简历内容",
    validate: "正在校验结构化结果",
    score: "正在计算匹配度与完成度",
    complete: "正在整理最终结果",
  };

  return phaseMap[phase] || "正在处理中";
}

function buildStreamActivityItems(liveStreamState, activeBoard) {
  if (liveStreamState.board !== activeBoard || !liveStreamState.active) {
    return [];
  }

  const items = [
    {
      key: "phase",
      label: getPhaseLabel(liveStreamState.phase),
      detail: liveStreamState.status || "模型正在处理当前任务。",
    },
  ];

  if (liveStreamState.phase === "search") {
    items.push({
      key: "search-tip",
      label: "正在查看岗位来源与要求",
      detail: "会优先结合联网岗位情报和你填写的 JD。",
    });
  }

  if (liveStreamState.phase === "draft" || liveStreamState.phase === "validate") {
    items.push({
      key: "draft-tip",
      label: "正在逐步写入与修正文稿",
      detail: "右侧简历草稿会随着结构化结果持续刷新。",
    });
  }

  if (liveStreamState.meta?.warning) {
    items.push({
      key: "warning",
      label: "已触发回退或告警处理",
      detail: liveStreamState.meta.warning,
    });
  }

  return items.slice(0, 3);
}

function getStreamStepText(liveStreamState, activeBoard) {
  if (liveStreamState.board !== activeBoard || !liveStreamState.active) {
    return "";
  }

  const step = Number(liveStreamState.step) || 0;
  const totalSteps = Number(liveStreamState.totalSteps) || 0;
  if (!step || !totalSteps) {
    return "";
  }

  return `第 ${Math.min(step, totalSteps)} / ${totalSteps} 步`;
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
    birth_date: "",
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

const FIELD_JUMP_CONFIG = Object.freeze({
  greenfield: {
    target_company: {
      sectionId: "greenfield-job-target",
      selectors: ['input[name="target_company"]'],
    },
    target_role: {
      sectionId: "greenfield-job-target",
      selectors: ['input[name="target_role"]'],
    },
    job_requirements: {
      sectionId: "greenfield-job-target",
      selectors: ['textarea[name="job_requirements"]'],
    },
    birth_date: {
      sectionId: "greenfield-profile",
      selectors: ['input[name="birth_date"]'],
    },
    email: {
      sectionId: "greenfield-profile",
      selectors: ['input[name="email"]'],
    },
    phone: {
      sectionId: "greenfield-profile",
      selectors: ['input[name="phone"]'],
    },
    full_name: {
      sectionId: "greenfield-profile",
      selectors: ['input[name="full_name"]', 'input[name="name"]'],
    },
    start_date: {
      sectionId: "greenfield-education",
      selectors: ['input[name="start_date"]'],
    },
    end_date: {
      sectionId: "greenfield-education",
      selectors: ['input[name="end_date"]'],
    },
  },
  existing_resume: {
    target_company: {
      sectionId: "existing-job-target",
      selectors: ['input[name="target_company"]'],
    },
    target_role: {
      sectionId: "existing-job-target",
      selectors: ['input[name="target_role"]'],
    },
    job_requirements: {
      sectionId: "existing-job-target",
      selectors: ['textarea[name="job_requirements"]'],
    },
  },
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

function resolveItemDates(item) {
  const startDate = normalizeMonthInput(item?.start_date || "");
  const endDate = normalizeMonthInput(item?.end_date || "", { allowPresent: true });

  if (startDate || endDate) {
    return {
      start_date: startDate,
      end_date: endDate,
    };
  }

  const cleaned = String(item?.duration || "").trim();
  if (!cleaned) {
    return { start_date: "", end_date: "" };
  }

  const monthMatches = cleaned.match(/\d{4}\s*(?:[-./年]\s*\d{1,2}\s*月?)/g) || [];
  if (monthMatches.length >= 2) {
    return {
      start_date: normalizeMonthInput(monthMatches[0]),
      end_date: normalizeMonthInput(monthMatches[1], { allowPresent: true }),
    };
  }

  if (monthMatches.length === 1) {
    return {
      start_date: normalizeMonthInput(monthMatches[0]),
      end_date: /至今|present|current|ongoing|now/i.test(cleaned) ? "至今" : "",
    };
  }

  return { start_date: "", end_date: "" };
}

function toEducationPayload(items) {
  return (items || [])
    .filter(hasContent)
    .map((item) => {
      const { start_date, end_date } = resolveItemDates(item);
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
      const { start_date, end_date } = resolveItemDates(item);
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
      const { start_date, end_date } = resolveItemDates(item);
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
      birth_date: (formState.basic_info.birth_date || "").trim(),
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

function truncateText(value, maxLength = 96) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
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

function buildReadinessGapText(items) {
  const pendingItems = (items || []).filter((item) => item?.applicable !== false && !item?.done);
  if (pendingItems.length === 0) {
    return "已满足当前执行条件";
  }

  const labels = pendingItems.slice(0, 2).map((item) => item.label);
  const suffix = pendingItems.length > 2 ? " 等条件" : "";
  return `还差 ${labels.join("、")}${suffix}`;
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

function clampProgress(progress) {
  const numericValue = Number(progress);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, numericValue));
}

function computeWeightedReadiness(segments) {
  const applicableSegments = (segments || []).filter((segment) => segment?.applicable !== false);
  const totalWeight = applicableSegments.reduce(
    (sum, segment) => sum + Math.max(0, Number(segment?.weight) || 0),
    0,
  );

  if (!totalWeight) {
    return 0;
  }

  const completedWeight = applicableSegments.reduce(
    (sum, segment) =>
      sum + clampProgress(segment?.progress) * Math.max(0, Number(segment?.weight) || 0),
    0,
  );

  return Math.max(0, Math.min(100, Math.round((completedWeight / totalWeight) * 100)));
}

export default function App() {
  const [activeBoard, setActiveBoard] = useState("greenfield");
  const [activeInfoPage, setActiveInfoPage] = useState(null);
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
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
  const [liveStreamState, setLiveStreamState] = useState(() => createEmptyLiveStreamState());
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [semanticAtsState, setSemanticAtsState] = useState(() => ({
    status: "idle",
    result: null,
    warning: "",
  }));
  const [ragInsightsState, setRagInsightsState] = useState(() => ({
    status: "idle",
    count: 0,
    mode: "idle",
    results: [],
    warning: "",
  }));
  const [jobInsightState, setJobInsightState] = useState(() => ({
    status: "idle",
    data: null,
  }));
  const [jobInsightDrawerOpen, setJobInsightDrawerOpen] = useState(false);
  const [pendingFieldJump, setPendingFieldJump] = useState(null);

  const lastSavedDraftHashRef = useRef("");
  const draftSaveInFlightRef = useRef(false);
  const liveStreamAbortRef = useRef(null);
  const streamRevealTimerRef = useRef(null);
  const streamRevealTargetRef = useRef("");
  const streamRevealCurrentRef = useRef("");
  const streamRevealBoardRef = useRef("");

  const loading = Boolean(loadingAction);
  const greenfieldJobInfoReady = hasRequiredJobInfo(greenfieldFormState.basic_info);
  const existingJobInfoReady = hasRequiredJobInfo(existingFormState);
  const activeWorkspace =
    activeBoard === "existing_resume" ? existingResumeWorkspace : greenfieldWorkspace;
  const activeJobInfo =
    activeBoard === "existing_resume" ? existingFormState : greenfieldFormState.basic_info;

  function resolveFieldJumpTarget(jumpRequest) {
    if (!jumpRequest) {
      return null;
    }

    const boardConfig = FIELD_JUMP_CONFIG[jumpRequest.board] || {};
    const fieldConfig = boardConfig[jumpRequest.field] || {};
    const selectors =
      fieldConfig.selectors?.length > 0
        ? fieldConfig.selectors
        : [`input[name="${jumpRequest.field}"]`, `textarea[name="${jumpRequest.field}"]`];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return {
          type: "field",
          node: element,
        };
      }
    }

    if (fieldConfig.sectionId) {
      const section = document.getElementById(fieldConfig.sectionId);
      if (section) {
        return {
          type: "section",
          node: section,
        };
      }
    }

    return null;
  }

  function executeFieldJump(jumpRequest) {
    const target = resolveFieldJumpTarget(jumpRequest);
    if (!target) {
      console.error("[跳转] 未找到字段或分区:", jumpRequest?.field);
      return false;
    }

    console.log("[跳转] 已定位目标:", jumpRequest.field, target.type);
    target.node.scrollIntoView({
      behavior: "smooth",
      block: target.type === "field" ? "center" : "start",
    });

    if (target.type === "field") {
      window.setTimeout(() => {
        target.node.focus?.();
        if (typeof target.node.select === "function") {
          target.node.select();
        }
      }, 240);
    }

    return true;
  }

  function handleJumpToField(fieldName) {
    const jumpRequest = {
      board: activeBoard,
      field: fieldName,
    };

    console.log("[跳转] 收到跳转请求:", jumpRequest);
    setPendingFieldJump(jumpRequest);

    if (activeInfoPage !== activeBoard) {
      handleOpenInfoPage(activeBoard);
    }
  }

  useEffect(() => {
    if (!pendingFieldJump || activeInfoPage !== pendingFieldJump.board) {
      return undefined;
    }

    let timerId = 0;
    let attempts = 0;

    const tryJump = () => {
      const success = executeFieldJump(pendingFieldJump);
      if (success) {
        setPendingFieldJump(null);
        return;
      }

      attempts += 1;
      if (attempts >= 8) {
        console.error("[跳转] 多次重试后仍未找到目标:", pendingFieldJump.field);
        setPendingFieldJump(null);
        return;
      }

      timerId = window.setTimeout(tryJump, 180);
    };

    timerId = window.setTimeout(tryJump, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeInfoPage, pendingFieldJump]);

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

  function stopResumeReveal() {
    if (streamRevealTimerRef.current) {
      window.clearInterval(streamRevealTimerRef.current);
      streamRevealTimerRef.current = null;
    }
  }

  function resetResumeReveal() {
    stopResumeReveal();
    streamRevealTargetRef.current = "";
    streamRevealCurrentRef.current = "";
    streamRevealBoardRef.current = "";
  }

  function setResumeTextImmediate(board, nextText) {
    const normalized = normalizeResumeText(nextText || "");
    streamRevealBoardRef.current = board;
    streamRevealTargetRef.current = normalized;
    streamRevealCurrentRef.current = normalized;
    updateWorkspace(board, (previous) => ({
      ...previous,
      resume_text: normalized,
    }));
  }

  function queueResumeTextReveal(board, nextText) {
    const normalized = normalizeResumeText(nextText || "");
    if (streamRevealBoardRef.current && streamRevealBoardRef.current !== board) {
      resetResumeReveal();
    }
    streamRevealBoardRef.current = board;

    if (!normalized) {
      setResumeTextImmediate(board, "");
      return;
    }

    const currentText = streamRevealCurrentRef.current || "";
    streamRevealTargetRef.current = normalized;

    if (!normalized.startsWith(currentText)) {
      setResumeTextImmediate(board, normalized);
      return;
    }

    if (currentText === normalized) {
      return;
    }

    if (streamRevealTimerRef.current) {
      return;
    }

    streamRevealTimerRef.current = window.setInterval(() => {
      const boardName = streamRevealBoardRef.current || board;
      const currentValue = streamRevealCurrentRef.current || "";
      const targetValue = streamRevealTargetRef.current || "";

      if (!targetValue) {
        stopResumeReveal();
        return;
      }

      if (!targetValue.startsWith(currentValue)) {
        streamRevealCurrentRef.current = targetValue;
        updateWorkspace(boardName, (previous) => ({
          ...previous,
          resume_text: targetValue,
        }));
        stopResumeReveal();
        return;
      }

      if (currentValue === targetValue) {
        stopResumeReveal();
        return;
      }

      const remaining = targetValue.slice(currentValue.length);
      const nextValue = `${currentValue}${remaining.slice(0, 1)}`;
      streamRevealCurrentRef.current = nextValue;
      updateWorkspace(boardName, (previous) => ({
        ...previous,
        resume_text: nextValue,
      }));

      if (nextValue === targetValue) {
        stopResumeReveal();
      }
    }, 18);
  }

  function renderStructuredResumeText(structuredResume) {
    if (!structuredResume || typeof structuredResume !== "object") {
      return "";
    }
    return normalizeResumeText(renderStructuredResumeMarkdown(structuredResume));
  }

  function applyWorkspaceResult(board, result, options = {}) {
    const nextResumeText = normalizeResumeText(result.resume_text || "");
    if (!options.preserveResumeText) {
      streamRevealBoardRef.current = board;
      streamRevealTargetRef.current = nextResumeText;
      streamRevealCurrentRef.current = nextResumeText;
    }
    updateWorkspace(board, (previous) => ({
      ...previous,
      title:
        result.title || (board === "existing_resume" ? "优化版简历草稿" : "新建简历草稿"),
      ...(options.preserveResumeText ? {} : { resume_text: nextResumeText }),
      analysis_notes: result.analysis_notes || [],
      generation_mode: result.mode || previous.generation_mode || "fallback",
      structured_resume: result.structured_resume || null,
      contract_report: result.contract_report || null,
    }));
  }

  function setQuestionDrafts(nextQuestions) {
    setQuestions(nextQuestions);
    setQuestionAnswers((previous) =>
      Object.fromEntries(nextQuestions.map((question) => [question, previous[question] || ""])),
    );
  }

  function applyResult(board, result, successMessage, options = {}) {
    applyWorkspaceResult(board, result, options);
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

    liveStreamAbortRef.current?.abort?.();
    resetResumeReveal();
    setLiveStreamState(createEmptyLiveStreamState());
    setJsonModalOpen(false);
    setJobInsightDrawerOpen(false);
    setHistoryDrawerOpen(false);
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
    setJsonModalOpen(false);
    setJobInsightDrawerOpen(false);
    setHistoryDrawerOpen(false);
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

  async function refreshJobInsight({ forceRefresh = false, board = activeBoard } = {}) {
    const jobInfo = board === "existing_resume" ? existingFormState : greenfieldFormState.basic_info;
    const targetCompany = jobInfo?.target_company?.trim() || "";
    const targetRole = jobInfo?.target_role?.trim() || "";
    const jobRequirements = jobInfo?.job_requirements?.trim() || "";

    if (backendStatus?.status !== "ok" || !targetCompany || !targetRole) {
      setJobInsightState({
        status: "idle",
        data: null,
      });
      return null;
    }

    setJobInsightState((previous) => ({
      ...previous,
      status: "loading",
    }));

    try {
      const result = await searchJobContext({
        target_company: targetCompany,
        target_role: targetRole,
        job_requirements: jobRequirements,
        force_refresh: forceRefresh,
      });
      setJobInsightState({
        status: "ready",
        data: result,
      });
      return result;
    } catch (error) {
      const fallbackResult = {
        query: [targetCompany, targetRole].filter(Boolean).join(" "),
        provider: "tavily",
        mode: "error",
        cached: false,
        results: [],
        warning: error?.message || "岗位情报搜索失败，当前仅基于已填写岗位信息继续执行。",
      };
      setJobInsightState({
        status: "error",
        data: fallbackResult,
      });
      return fallbackResult;
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
        setBackendStatus({
          status: "offline",
          configured: false,
          ai_available: false,
          provider: "",
          base_url: "",
          model: "",
          wire_api: "",
        });
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

  useEffect(() => {
    const resumeText = activeBoard === "existing_resume"
      ? activeWorkspace.resume_text.trim() || existingFormState.resume_source_text.trim()
      : activeWorkspace.resume_text.trim();
    const jobDescription = [
      activeJobInfo?.target_role,
      activeJobInfo?.target_company,
      activeJobInfo?.job_requirements,
    ]
      .map((value) => value?.trim?.() || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (backendStatus?.status !== "ok" || !resumeText || !jobDescription) {
      setSemanticAtsState({
        status: "idle",
        result: null,
        warning: "",
      });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSemanticAtsState((previous) => ({
        ...previous,
        status: "loading",
      }));

      try {
        const result = await scoreSemanticAts({
          resume_text: resumeText,
          job_description: jobDescription,
        });

        if (cancelled) return;
        setSemanticAtsState({
          status: "ready",
          result,
          warning: result.warning || "",
        });
      } catch (error) {
        if (cancelled) return;
        setSemanticAtsState({
          status: "fallback",
          result: null,
          warning: error?.message || "语义 ATS 评分失败，已回退到本地评分。",
        });
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeBoard,
    backendStatus?.status,
    activeWorkspace.resume_text,
    activeJobInfo?.target_company,
    activeJobInfo?.target_role,
    activeJobInfo?.job_requirements,
    existingFormState.resume_source_text,
  ]);

  useEffect(() => {
    const query = [activeJobInfo?.target_role, activeJobInfo?.job_requirements]
      .map((value) => value?.trim?.() || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (backendStatus?.status !== "ok" || !query) {
      setRagInsightsState({
        status: "idle",
        count: 0,
        mode: "idle",
        results: [],
        warning: "",
      });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRagInsightsState((previous) => ({
        ...previous,
        status: "loading",
      }));

      try {
        const result = await searchRagReferences({
          query,
          top_k: 4,
        });

        if (cancelled) return;
        setRagInsightsState({
          status: "ready",
          count: result.count || 0,
          mode: result.mode || "empty",
          results: result.results || [],
          warning: result.warning || "",
        });
      } catch (error) {
        if (cancelled) return;
        setRagInsightsState({
          status: "fallback",
          count: 0,
          mode: "error",
          results: [],
          warning: error?.message || "中文参考库检索失败。",
        });
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    backendStatus?.status,
    activeJobInfo?.target_role,
    activeJobInfo?.job_requirements,
  ]);

  useEffect(() => {
    const jobInfo = activeBoard === "existing_resume" ? existingFormState : greenfieldFormState.basic_info;
    const targetCompany = jobInfo?.target_company?.trim() || "";
    const targetRole = jobInfo?.target_role?.trim() || "";
    const jobRequirements = jobInfo?.job_requirements?.trim() || "";

    if (backendStatus?.status !== "ok" || !targetCompany || !targetRole) {
      setJobInsightState({
        status: "idle",
        data: null,
      });
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setJobInsightState((previous) => ({
        ...previous,
        status: "loading",
      }));

      try {
        const result = await searchJobContext({
          target_company: targetCompany,
          target_role: targetRole,
          job_requirements: jobRequirements,
          force_refresh: false,
        });

        if (cancelled) return;
        setJobInsightState({
          status: "ready",
          data: result,
        });
      } catch (error) {
        if (cancelled) return;
        setJobInsightState({
          status: "error",
          data: {
            query: [targetCompany, targetRole].filter(Boolean).join(" "),
            provider: "tavily",
            mode: "error",
            cached: false,
            results: [],
            warning: error?.message || "岗位情报搜索失败，当前仅基于已填写岗位信息继续执行。",
          },
        });
      }
    }, 360);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeBoard,
    backendStatus?.status,
    existingFormState.target_company,
    existingFormState.target_role,
    existingFormState.job_requirements,
    greenfieldFormState.basic_info.target_company,
    greenfieldFormState.basic_info.target_role,
    greenfieldFormState.basic_info.job_requirements,
  ]);

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

    liveStreamAbortRef.current?.abort?.();
    const controller = new AbortController();
    liveStreamAbortRef.current = controller;
    resetResumeReveal();
    setActiveInfoPage(null);
    setLoadingAction("generate");
    setResumeTextImmediate("greenfield", "");
    updateWorkspace("greenfield", (previous) => ({
      ...previous,
      title: "",
      resume_text: "",
      structured_resume: null,
      contract_report: null,
      analysis_notes: [],
      generation_mode: "streaming",
    }));
    setLiveStreamState({
      board: "greenfield",
      active: true,
      status: "正在锁定数据契约并启动 AI 流式生成...",
      phase: "search",
      step: 1,
      totalSteps: 6,
      meta: null,
      partial_result: null,
      raw_json: "",
      error: "",
    });
    try {
      const result = await generateGreenfieldResumeStream(
        {
          profile: buildProfilePayload(nextFormState),
        },
        {
          signal: controller.signal,
          onStatus: (payload) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "greenfield",
              status: payload?.message || previous.status,
              phase: payload?.phase || previous.phase,
              step: typeof payload?.step === "number" ? payload.step : previous.step,
              totalSteps:
                typeof payload?.total_steps === "number"
                  ? payload.total_steps
                  : typeof payload?.totalSteps === "number"
                    ? payload.totalSteps
                    : previous.totalSteps,
              meta: payload?.meta || previous.meta,
            }));
          },
          onPartial: (partialResult, rawJson) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "greenfield",
              partial_result: partialResult,
              raw_json: rawJson,
            }));
            if (partialResult?.structured_resume) {
              const previewText = renderStructuredResumeText(partialResult.structured_resume);
              queueResumeTextReveal("greenfield", previewText);
              updateWorkspace("greenfield", (previous) => ({
                ...previous,
                title: partialResult.title || previous.title,
                structured_resume: partialResult.structured_resume || previous.structured_resume,
                analysis_notes:
                  partialResult.analysis_notes?.length > 0
                    ? partialResult.analysis_notes
                    : previous.analysis_notes,
                generation_mode: previous.generation_mode === "openai" ? previous.generation_mode : "streaming",
              }));
            }
          },
          onError: (error) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "greenfield",
              error: error.message,
              status: error.message,
            }));
          },
          onFinal: (result) => {
            queueResumeTextReveal(
              "greenfield",
              result.resume_text || renderStructuredResumeText(result.structured_resume),
            );
            setLiveStreamState((previous) => ({
              ...previous,
              board: "greenfield",
              error: "",
            }));
            applyResult(
              "greenfield",
              result,
              result.mode === "fallback"
                ? "结构化流式未完全锁定，系统已自动切换为本地结构化结果。"
                : result.needs_clarification
                ? "新建简历初稿已生成，仍有部分信息待补充。"
                : `${sourceLabel}，你可以继续手动修改，或补充修订要求后交给 AI。`,
              { preserveResumeText: true },
            );
          },
        },
      );
      setLiveStreamState((previous) => ({
        ...previous,
        board: "greenfield",
        active: false,
        status:
          result.mode === "fallback"
            ? "已切换为本地结构化结果，可继续编辑与导出。"
            : "流式生成完成，结构化契约已锁定。",
        partial_result: result,
        error: "",
      }));
      setQuestionFlowMode("greenfield");
      if (result.needs_clarification && (result.questions || []).length > 0) {
        setQuestionsOpen(true);
      }
      await refreshMemory();
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatusText("已中止流式生成。");
      } else {
        setStatusText(`生成失败：${error.message}`);
      }
      setLiveStreamState((previous) => ({
        ...previous,
        board: "greenfield",
        active: false,
        error: error?.message || "流式生成失败。",
        status: error?.message || "流式生成失败。",
      }));
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

  async function runExistingResumeStream() {
    const requiredJobInfoError = getRequiredJobInfoError(existingFormState);
    if (requiredJobInfoError) {
      setStatusText(requiredJobInfoError);
      return;
    }

    if (!existingFormState.resume_source_text.trim()) {
      setStatusText("请先上传或粘贴你的现有简历，然后再开始流式生成。");
      return;
    }

    liveStreamAbortRef.current?.abort?.();
    const controller = new AbortController();
    liveStreamAbortRef.current = controller;
    resetResumeReveal();
    setActiveInfoPage(null);

    setLoadingAction("existing_stream");
    setResumeTextImmediate("existing_resume", "");
    updateWorkspace("existing_resume", (previous) => ({
      ...previous,
      title: "",
      resume_text: "",
      structured_resume: null,
      contract_report: null,
      analysis_notes: [],
      generation_mode: "streaming",
    }));
    setLiveStreamState({
      board: "existing_resume",
      active: true,
      status: "正在锁定数据契约并启动 AI 流式生成...",
      phase: "search",
      step: 1,
      totalSteps: 6,
      meta: null,
      partial_result: null,
      raw_json: "",
      error: "",
    });
    setStatusText("正在打开流式生成，右侧预览会随着结果实时更新。");

    try {
      const finalResult = await generateResumeStream(
        {
          resume_text: existingFormState.resume_source_text,
          target_company: existingFormState.target_company,
          target_role: existingFormState.target_role,
          job_requirements: existingFormState.job_requirements,
          instruction: existingResumeWorkspace.revision_instruction || "",
          additional_answers: existingFormState.additional_answers || [],
        },
        {
          signal: controller.signal,
          onStatus: (payload) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "existing_resume",
              status: payload?.message || previous.status,
              phase: payload?.phase || previous.phase,
              step: typeof payload?.step === "number" ? payload.step : previous.step,
              totalSteps:
                typeof payload?.total_steps === "number"
                  ? payload.total_steps
                  : typeof payload?.totalSteps === "number"
                    ? payload.totalSteps
                    : previous.totalSteps,
              meta: payload?.meta || previous.meta,
            }));
          },
          onPartial: (partialResult, rawJson) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "existing_resume",
              partial_result: partialResult,
              raw_json: rawJson,
            }));
            if (partialResult?.structured_resume) {
              const previewText = renderStructuredResumeText(partialResult.structured_resume);
              queueResumeTextReveal("existing_resume", previewText);
              updateWorkspace("existing_resume", (previous) => ({
                ...previous,
                title: partialResult.title || previous.title,
                structured_resume: partialResult.structured_resume || previous.structured_resume,
                analysis_notes:
                  partialResult.analysis_notes?.length > 0
                    ? partialResult.analysis_notes
                    : previous.analysis_notes,
                generation_mode: previous.generation_mode === "openai" ? previous.generation_mode : "streaming",
              }));
            }
          },
          onError: (error) => {
            setLiveStreamState((previous) => ({
              ...previous,
              board: "existing_resume",
              error: error.message,
              status: error.message,
            }));
          },
          onFinal: (result) => {
            queueResumeTextReveal(
              "existing_resume",
              result.resume_text || renderStructuredResumeText(result.structured_resume),
            );
            setLiveStreamState((previous) => ({
              ...previous,
              board: "existing_resume",
              error: "",
            }));
            applyResult(
              "existing_resume",
              result,
              result.mode === "fallback"
                ? "结构化流式未完全锁定，系统已自动切换为本地结构化结果。"
                : result.needs_clarification
                ? "流式生成完成，但仍有部分信息需要补充。"
                : "流式生成完成，右侧预览已锁定最新结果。",
              { preserveResumeText: true },
            );
          },
        },
      );
      setLiveStreamState((previous) => ({
        ...previous,
        board: "existing_resume",
        active: false,
        status:
          finalResult.mode === "fallback"
            ? "已切换为本地结构化结果，可继续编辑与导出。"
            : "流式生成完成，结构化契约已锁定。",
        partial_result: finalResult,
        error: "",
      }));
      if (finalResult.needs_clarification && (finalResult.questions || []).length > 0) {
        setQuestionFlowMode("existing_resume");
        setQuestionsOpen(true);
      }
      await refreshMemory();
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatusText("已中止流式生成。");
      } else {
        setStatusText(`流式生成失败：${error.message}`);
      }
      setLiveStreamState((previous) => ({
        ...previous,
        board: "existing_resume",
        active: false,
        error: error?.message || "流式生成失败。",
        status: error?.message || "流式生成失败。",
      }));
    } finally {
      setLoadingAction("");
    }
  }

  async function handlePrimaryWorkspaceAction() {
    if (activeBoard === "existing_resume") {
      await runExistingResumeStream();
      return;
    }

    setActiveInfoPage(null);
    await generateWithCurrentState(greenfieldFormState, "简历初稿已生成");
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
    resetResumeReveal();
    setGreenfieldFormState(cloneFormState(INITIAL_GREENFIELD_FORM_STATE));
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空新建简历资料页中的全部内容。");
  }

  function handleClearExistingInfo() {
    liveStreamAbortRef.current?.abort?.();
    resetResumeReveal();
    setExistingFormState(createEmptyExistingResumeInput());
    setLiveStreamState(createEmptyLiveStreamState());
    setQuestions([]);
    setQuestionAnswers({});
    setStatusText("已清空现有简历优化资料页中的岗位信息、简历原文和补充回答。");
  }

  function handleClearResume() {
    resetResumeReveal();
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

    if (!activeWorkspace.revision_instruction.trim()) {
      setStatusText("请先填写 AI 改写指令，再执行结构化修订。");
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
        title: activeWorkspace.title || buildResumeSnapshotTitle(activeJobInfo.target_company, activeJobInfo.target_role),
        target_company: activeJobInfo.target_company,
        target_role: activeJobInfo.target_role,
        resume_text: activeWorkspace.resume_text,
        generation_mode: activeWorkspace.generation_mode || "manual_preserve",
        analysis_notes: activeWorkspace.analysis_notes || [],
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
      title: snapshot?.title?.trim() || restoredTitle,
      resume_text: restoredText,
      generation_mode: snapshot.generation_mode || "fallback",
      analysis_notes: Array.isArray(snapshot?.analysis_notes)
        ? snapshot.analysis_notes
        : previous.analysis_notes,
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
  const isLocalFallbackReady =
    modelStatus?.status === "fallback_only" ||
    (!modelStatusLoading && backendStatus?.status === "ok" && !backendStatus?.ai_available);
  const modelLatencyLabel =
    typeof modelStatus?.latency_ms === "number"
      ? `${modelStatus.latency_ms} ms`
      : modelStatusLoading
        ? "检测中..."
        : isLocalFallbackReady
          ? "本地模式"
        : backendStatus?.status === "ok"
          ? "待检测"
          : "不可用";
  const modelCheckedLabel = modelStatus?.checked_at
    ? new Date(modelStatus.checked_at).toLocaleTimeString()
    : modelStatusLoading
      ? "检测中..."
      : "未检测";
  const modelAvailability =
    typeof modelStatus?.reachable === "boolean"
      ? modelStatus.reachable
      : Boolean(backendStatus?.ai_available);
  const modelStatusTone =
    modelStatusLoading
      ? "pending"
      : isLocalFallbackReady
        ? "local"
        : modelAvailability
        ? "healthy"
        : "error";
  const modelHealthLabel =
    modelStatusTone === "healthy"
      ? "运行正常"
      : modelStatusTone === "local"
        ? "本地演示"
      : modelStatusTone === "error"
        ? "连接异常"
        : "检测中";
  const modelAvailabilityLabel =
    modelStatusTone === "healthy"
      ? "云端可用"
      : modelStatusTone === "local"
        ? "本地可用"
        : "不可用";
  const modelStatusHint =
    modelStatusTone === "local"
      ? "当前未配置云端模型密钥，系统已切换到本地兜底演示模式。简历生成、改写、导出、历史恢复等核心流程仍可验证；如需实时 AI，只需在 backend/.env 中填写受限演示密钥。"
      : modelStatusTone === "error"
      ? modelStatus?.error || "模型探测失败，请检查后端配置或接口连通性。"
      : modelStatusTone === "pending"
        ? "正在重新探测模型可用性与接口延迟。"
        : "手动刷新后会重新探测当前模型与接口延迟。";

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
  const greenfieldProfileReady = greenfieldProfileFieldCount > 0;
  const greenfieldStructuredReady = greenfieldStructuredCount > 0;
  const greenfieldFollowupApplicable = hasPendingQuestionsForActiveBoard;
  const existingResumeReady = Boolean(existingFormState.resume_source_text.trim());
  const existingAnswerCount = existingFormState.additional_answers.length;
  const existingFollowupApplicable = hasPendingQuestionsForActiveBoard;
  const accountMembershipLabel =
    MEMBERSHIP_LEVEL_LABELS[greenfieldFormState.membership_level] || "高级用户";
  const accountBalanceLabel = `¥ ${MOCK_ACCOUNT_ENTITLEMENTS.balance.toFixed(2)}`;
  const accountPointsLabel = MOCK_ACCOUNT_ENTITLEMENTS.points.toLocaleString("zh-CN");
  const currentBillingModeLabel =
    BILLING_MODE_LABELS[MOCK_ACCOUNT_ENTITLEMENTS.billing_mode] || "按量付费";
  const supportedBillingModeLabels = MOCK_ACCOUNT_ENTITLEMENTS.supported_billing_modes.map(
    (mode) => BILLING_MODE_LABELS[mode] || mode,
  );

  const greenfieldReadiness = computeWeightedReadiness([
    { weight: 40, progress: greenfieldJobInfoReady ? 1 : 0 },
    { weight: 30, progress: greenfieldProfileReady ? 1 : 0 },
    {
      weight: 30,
      progress: greenfieldStructuredReady ? 1 : 0,
    },
    {
      weight: 15,
      progress: hasPendingQuestionsForActiveBoard ? 0 : 1,
      applicable: greenfieldFollowupApplicable,
    },
  ]);
  const existingReadiness = computeWeightedReadiness([
    { weight: 45, progress: existingJobInfoReady ? 1 : 0 },
    { weight: 40, progress: existingResumeReady ? 1 : 0 },
    {
      weight: 15,
      progress: hasPendingQuestionsForActiveBoard ? 0 : 1,
      applicable: existingFollowupApplicable,
    },
  ]);
  const activeReadiness =
    activeBoard === "existing_resume" ? existingReadiness : greenfieldReadiness;
  const existingReadinessChecklist = [
    {
      label: "岗位锚点",
      done: existingJobInfoReady,
    },
    {
      label: "原始简历",
      done: existingResumeReady,
    },
    {
      label: "补充追问",
      done: !hasPendingQuestionsForActiveBoard,
      applicable: existingFollowupApplicable,
    },
  ];
  const greenfieldReadinessChecklist = [
    {
      label: "岗位锚点",
      done: greenfieldJobInfoReady,
    },
    {
      label: "候选人基础资料",
      done: greenfieldProfileReady,
    },
    {
      label: "经历或项目素材",
      done: greenfieldStructuredReady,
    },
    {
      label: "补充追问",
      done: !hasPendingQuestionsForActiveBoard,
      applicable: greenfieldFollowupApplicable,
    },
  ];
  const activeReadinessChecklist =
    activeBoard === "existing_resume" ? existingReadinessChecklist : greenfieldReadinessChecklist;
  const activeReadinessGap = buildReadinessGapText(activeReadinessChecklist);
  const activeReadinessTone =
    activeReadiness >= 80 ? "可执行" : activeReadiness >= 50 ? "准备中" : "待整理";
  const activeReadinessDescription =
    activeBoard === "existing_resume"
      ? "岗位锚点、原始简历和追问回答都满足后，优化进度会直接到 100%。"
      : "新建简历只按可见必需条件计分，附件不会再无故压低进度。";
  const primaryWorkspaceActionDisabled =
    activeBoard === "existing_resume"
      ? loading || !existingJobInfoReady || !existingResumeReady
      : loading || !greenfieldJobInfoReady;
  const liveStreamSnippet = liveStreamState.raw_json
    ? liveStreamState.raw_json.slice(-1200)
    : "";
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
  const isActiveBoardStreaming = liveStreamState.board === activeBoard && liveStreamState.active;
  const activeStreamCharCount =
    liveStreamState.board === activeBoard ? liveStreamState.raw_json.length : 0;
  const activePartialResult =
    liveStreamState.board === activeBoard ? liveStreamState.partial_result : null;
  const activeStructuredResume =
    activeWorkspace.structured_resume || activePartialResult?.structured_resume || null;
  const activeContractReport =
    activeWorkspace.contract_report || activePartialResult?.contract_report || null;
  const activeSectionCounts = activeContractReport?.section_counts || {};
  const activeStructuredExperienceCount = Array.isArray(activeStructuredResume?.experience)
    ? activeStructuredResume.experience.length
    : 0;
  const activeStructuredProjectCount = Array.isArray(activeStructuredResume?.projects)
    ? activeStructuredResume.projects.length
    : 0;
  const activeStructuredEducationCount = Array.isArray(activeStructuredResume?.education)
    ? activeStructuredResume.education.length
    : 0;
  const activeStructuredSkillCount = Array.isArray(activeStructuredResume?.skills)
    ? activeStructuredResume.skills.length
    : 0;
  const activeResumeLength = activeWorkspace.resume_text.trim().length;
  const activeAnalysisCount = activeWorkspace.analysis_notes?.length || 0;
  const activeQuestionCount =
    activeContractReport?.question_count ??
    (hasPendingQuestionsForActiveBoard ? questions.length : 0);
  const activeContractSource = activeContractReport?.source || "";
  const activeContractWarning = activeContractReport?.warning?.trim() || "";
  const activeContractSourceLabel =
    activeContractSource === "fallback"
      ? "回退 Contract"
      : activeContractReport?.validated
        ? "模型 Contract"
        : "待校验";
  const activeContractHealthLabel = activeContractReport
    ? activeContractReport.llm_contract_ok
      ? "LLM Contract 正常"
      : "已触发回退"
    : "等待校验";
  const workspaceMonitorLabel = isActiveBoardStreaming
    ? "流式写入中"
    : activeBoard === "existing_resume"
      ? existingResumeReady
        ? "待启动优化"
        : "待准备资料"
      : greenfieldJobInfoReady
        ? "待启动生成"
        : "待准备资料";
  const workspaceMonitorSummary =
    activeBoard === "existing_resume"
      ? existingResumeReady
        ? "点击资料录入旁边的主按钮后，模型会按岗位锚点和原始简历逐段回写右侧正文。"
        : "请先补齐岗位信息并导入原始简历，再从左侧控制塔启动流式优化。"
      : greenfieldJobInfoReady
        ? "点击左侧控制塔主按钮后，模型会根据候选人素材与附件上下文逐段生成草稿。"
        : "请先完善岗位信息与候选人素材，再启动流式生成。";
  const workspaceMonitorDetail =
    liveStreamState.board === activeBoard && liveStreamState.status
      ? liveStreamState.status
      : activeBoard === "existing_resume"
        ? "优化模式会先锁定结构化契约，再逐步将可用字段和最终正文同步到右侧预览。"
        : "新建模式会先出现骨架，再根据已收到的片段逐字写入右侧正文。";
  const workspaceMonitorJsonFallback =
    activeBoard === "existing_resume"
      ? "开始流式优化后，这里会持续显示模型已经返回的结构化 JSON 片段。"
      : "启动生成后，这里会显示模型当前已经返回的结构化 JSON 片段，方便确认它不是一次性输出完整结果。";
  const workspaceMonitorStats = [
    {
      label: "正文字符",
      value: activeResumeLength,
      meta: activeResumeLength > 0 ? "右侧正文已落版" : "等待正文写入",
    },
    {
      label: "工作经历",
      value: activeSectionCounts.experience ?? activeStructuredExperienceCount,
      meta: "结构化工作经历条目",
    },
    {
      label: "项目经历",
      value: activeSectionCounts.projects ?? activeStructuredProjectCount,
      meta: "项目证明与成果卡片",
    },
    {
      label: "教育背景",
      value: activeSectionCounts.education ?? activeStructuredEducationCount,
      meta: "学校、学位与亮点",
    },
    {
      label: "技能分组",
      value: activeSectionCounts.skill_categories ?? activeStructuredSkillCount,
      meta: "已生成的技能分组数",
    },
    {
      label: "处理说明",
      value: activeAnalysisCount,
      meta: activeQuestionCount > 0 ? `${activeQuestionCount} 个追问待处理` : "当前无待处理追问",
    },
  ];

  const activeResumeSeedText = activeStructuredResume
    ? renderStructuredResumeText(activeStructuredResume)
    : "";
  const activeScoringResumeText = activeWorkspace.resume_text.trim()
    ? activeWorkspace.resume_text
    : activeResumeSeedText;
  const activeAtsJobDescription = [
    activeJobInfo?.target_role,
    activeJobInfo?.target_company,
    activeJobInfo?.job_requirements,
  ]
    .map((value) => value?.trim?.() || "")
    .filter(Boolean)
    .join("\n");
  const hasAtsJobDescription = Boolean(activeJobInfo?.job_requirements?.trim());
  const activeAtsResumeData =
    activeBoard === "existing_resume"
      ? activeScoringResumeText.trim()
        ? {
            structured_resume: activeStructuredResume || null,
            resume_text: activeScoringResumeText,
          }
        : existingFormState.resume_source_text.trim()
          ? {
              resume_text: existingFormState.resume_source_text,
            }
          : null
      : activeScoringResumeText.trim()
        ? {
            structured_resume: activeStructuredResume || null,
            resume_text: activeScoringResumeText,
          }
        : null;
  const localAtsResult =
    activeAtsResumeData && hasAtsJobDescription && activeAtsJobDescription.trim()
      ? calculateATSScore(activeAtsResumeData, activeAtsJobDescription)
      : null;
  const activeAtsResult = semanticAtsState.result || localAtsResult;
  const activeAtsMeta = activeAtsResult
    ? {
        scoreModeLabel:
          semanticAtsState.result?.mode === "embedding"
            ? "语义嵌入评分"
            : semanticAtsState.result?.mode === "lexical_fallback"
              ? "语义回退评分"
              : "本地关键词评分",
        providerLabel: semanticAtsState.result?.model
          ? `${semanticAtsState.result.provider} / ${semanticAtsState.result.model}`
          : semanticAtsState.result?.provider || "local",
        semanticSimilarity:
          typeof semanticAtsState.result?.semanticSimilarity === "number"
            ? semanticAtsState.result.semanticSimilarity
            : null,
        keywordCoverage:
          typeof semanticAtsState.result?.keywordCoverage === "number"
            ? semanticAtsState.result.keywordCoverage
            : null,
        ragHitCount: ragInsightsState.count || 0,
        ragModeLabel:
          ragInsightsState.mode === "semantic"
            ? "语义检索"
            : ragInsightsState.mode === "lexical_fallback"
              ? "词法回退"
              : ragInsightsState.mode === "empty"
                ? "暂无命中"
                : ragInsightsState.mode === "disabled"
                  ? "未启用"
                  : "待检索",
        warning: semanticAtsState.warning || ragInsightsState.warning || "",
      }
    : null;
  const atsEmptyStateCopy = !activeJobInfo?.job_requirements?.trim()
    ? "先补充岗位 JD，ATS 才能判断关键词覆盖和岗位匹配度。"
    : activeBoard === "existing_resume"
      ? existingResumeReady
        ? "正在等待可评分的简历内容。上传后可先对原始简历打分，优化后会继续实时刷新。"
        : "上传或粘贴现有简历后，这里会显示 ATS 分数、命中关键词和缺失关键词。"
      : "先生成简历草稿，ATS 才会基于当前结果给出匹配分数和改进建议。";
  const activeSummaryItems =
    activeBoard === "existing_resume"
      ? [
          {
            label: "目标公司",
            value: activeJobInfo?.target_company?.trim() || "未填写",
            meta: "仅在专门的信息编辑页修改",
          },
          {
            label: "目标岗位",
            value: activeJobInfo?.target_role?.trim() || "未填写",
            meta: "下一轮优化的核心锚点",
          },
          {
            label: "JD 摘要",
            value: truncateText(activeJobInfo?.job_requirements || "", 88) || "未填写",
            meta: "ATS 评分和优化都会读取这一段",
          },
          {
            label: "原始简历",
            value:
              existingFormState.resume_source_name ||
              (existingFormState.resume_source_text.trim()
                ? `${existingFormState.resume_source_text.trim().length} 字符`
                : "尚未上传"),
            meta: `已保存 ${existingAnswerCount} 条追问回答`,
          },
        ]
      : [
          {
            label: "目标公司",
            value: activeJobInfo?.target_company?.trim() || "未填写",
            meta: "仅在专门的信息编辑页修改",
          },
          {
            label: "目标岗位",
            value: activeJobInfo?.target_role?.trim() || "未填写",
            meta: "下一轮生成的核心目标",
          },
          {
            label: "JD 摘要",
            value: truncateText(activeJobInfo?.job_requirements || "", 88) || "未填写",
            meta: "ATS 评分会优先读取这一段",
          },
          {
            label: "候选素材",
            value: `${greenfieldProfileFieldCount + greenfieldStructuredCount} 项信号`,
            meta: `已关联 ${greenfieldAttachmentCount} 个附件`,
          },
        ];
  const editAnchorItems =
    activeInfoPage === "existing_resume"
      ? [
          { id: "existing-job-target", label: "目标岗位", meta: "公司、岗位与 JD", index: "01" },
          { id: "existing-status", label: "资料状态", meta: "输入状态与追问回答", index: "02" },
          { id: "existing-source", label: "原始简历", meta: "上传或粘贴待优化简历", index: "03" },
        ]
      : [
          { id: "greenfield-job-target", label: "目标岗位", meta: "公司、岗位与 JD", index: "01" },
          { id: "greenfield-management", label: "工作区设置", meta: "保存、恢复与模块管理", index: "02" },
          { id: "greenfield-profile", label: "基础资料", meta: "候选人基本信息", index: "03" },
          { id: "greenfield-skills", label: "技能清单", meta: "技能库存", index: "04" },
          { id: "greenfield-education", label: "教育背景", meta: "学校与亮点", index: "05" },
          { id: "greenfield-projects", label: "项目经历", meta: "项目证明与附件", index: "06" },
          { id: "greenfield-experiences", label: "工作经历", meta: "履历与成果表达", index: "07" },
        ];
  const liveJsonContent = liveStreamSnippet || workspaceMonitorJsonFallback;
  const workspaceStatusTone = isActiveBoardStreaming
    ? "流式生成中"
    : loading
      ? "处理中"
      : hasPendingQuestionsForActiveBoard
        ? "待补充回答"
        : "已就绪";
  const dashboardResultTitle =
    activeWorkspace.title ||
    (activeBoard === "existing_resume" ? "优化简历草稿" : "生成简历草稿");
  const infoPageHeading =
    activeInfoPage === "existing_resume" ? "沉浸式简历优化编辑" : "沉浸式候选人资料编辑";
  const infoPageDescription =
    activeInfoPage === "existing_resume"
      ? "这个模式只处理目标岗位信息和原始简历。ATS、JSON 和系统状态会留在工作台，不在这里干扰你。"
      : "这个模式只处理目标岗位和候选人素材。主工作台保持预览优先，不再堆叠表单。";
  const activeStreamStatusText =
    liveStreamState.board === activeBoard ? liveStreamState.status : "";
  const activeStreamStepText = getStreamStepText(liveStreamState, activeBoard);
  const activeStreamActivities = buildStreamActivityItems(liveStreamState, activeBoard);
  const primaryActionCta =
    activeBoard === "existing_resume"
      ? isActiveBoardStreaming
        ? "优化中..."
        : "开始优化"
      : loadingAction === "generate"
        ? "生成中..."
        : "生成简历";

  return (
    <div className="atelier-app-shell w-full h-screen flex overflow-hidden bg-gray-50 text-gray-900">
      <WorkspaceSidebar
        sessionUsername={sessionUsername}
        currentModeLabel={currentModeLabel}
        accountBalanceLabel={accountBalanceLabel}
        accountPointsLabel={accountPointsLabel}
        accountMembershipLabel={accountMembershipLabel}
        currentBillingModeLabel={currentBillingModeLabel}
        currentModelLabel={currentModelLabel}
        modelAvailability={modelAvailability}
        modelAvailabilityLabel={modelAvailabilityLabel}
        modelStatusTone={modelStatusTone}
        modelHealthLabel={modelHealthLabel}
        modelLatencyLabel={modelLatencyLabel}
        modelCheckedLabel={modelCheckedLabel}
        modelStatusHint={modelStatusHint}
        modelStatusLoading={modelStatusLoading}
        onRefreshModel={refreshModelStatus}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="atelier-header h-16 shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="flex h-full items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {activeInfoPage ? "编辑模式" : "工作台"} - {currentModeLabel}
              </p>
              <p className="truncate text-xs text-gray-500">
                当前进度 {activeReadiness}% · {activeReadinessGap} · 正文{" "}
                {activeResumeLength > 0 ? `${activeResumeLength} 字符` : "尚未生成"} · {workspaceStatusTone}
              </p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => handleSwitchBoard("greenfield")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    activeBoard === "greenfield"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  新建简历
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchBoard("existing_resume")}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    activeBoard === "existing_resume"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  优化简历
                </button>
              </div>

              {activeInfoPage ? (
                <button
                  type="button"
                  onClick={handleCloseInfoPage}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                >
                  返回工作台
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenInfoPage(activeBoard)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                  >
                    进入编辑页
                  </button>
                  {hasPendingQuestionsForActiveBoard ? (
                    <button
                      type="button"
                      onClick={() => setQuestionsOpen(true)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                    >
                      待补充追问
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setHistoryDrawerOpen(true)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                  >
                    历史记录
                  </button>
                  <button
                    type="button"
                    onClick={handlePrimaryWorkspaceAction}
                    disabled={primaryWorkspaceActionDisabled}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {primaryActionCta}
                  </button>
                  <span
                    className={`workspace-readiness-pill workspace-readiness-pill--${
                      activeReadiness >= 80 ? "strong" : activeReadiness >= 50 ? "medium" : "soft"
                    }`}
                  >
                    当前进度 {activeReadiness}%
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {activeInfoPage ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[1500px] gap-8 px-6 py-6">
              <EditAnchorNav items={editAnchorItems} />

              <div className="min-w-0 flex-1">
                <div className="mx-auto max-w-4xl space-y-6">
                  <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-600">
                          专注模式
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                          {infoPageHeading}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-500">{infoPageDescription}</p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCloseInfoPage}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                      >
                        返回预览
                      </button>
                    </div>
                  </section>

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
                      onBack={handleCloseInfoPage}
                      hasPendingQuestions={hasPendingQuestionsForActiveBoard}
                      onOpenQuestions={() => setQuestionsOpen(true)}
                      sectionIds={{
                        jobTarget: "greenfield-job-target",
                        management: "greenfield-management",
                        profile: "greenfield-profile",
                        skills: "greenfield-skills",
                        education: "greenfield-education",
                        projects: "greenfield-projects",
                        experiences: "greenfield-experiences",
                      }}
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
                      onClearInfo={handleClearExistingInfo}
                      onBack={handleCloseInfoPage}
                      hasPendingQuestions={hasPendingQuestionsForActiveBoard}
                      onOpenQuestions={() => setQuestionsOpen(true)}
                      sectionIds={{
                        jobTarget: "existing-job-target",
                        status: "existing-status",
                        source: "existing-source",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-[1600px] space-y-6">
              <section className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-8">
                  <AtsDashboard
                    result={activeAtsResult}
                    meta={activeAtsMeta}
                    isStreaming={isActiveBoardStreaming || semanticAtsState.status === "loading"}
                    emptyStateCopy={atsEmptyStateCopy}
                  />

                  <ResumeWorkbenchPreview
                    boardLabel={currentModeLabel}
                    title={dashboardResultTitle}
                    structuredResume={activeStructuredResume}
                    resumeText={activeWorkspace.resume_text}
                    generationMode={activeWorkspace.generation_mode}
                    isStreaming={isActiveBoardStreaming}
                    streamStatus={activeStreamStatusText}
                    summaryItems={activeSummaryItems}
                  />
                </div>

                <div className="space-y-6 xl:col-span-4 xl:flex xl:min-h-full xl:flex-col">
                  <AiProgressTimeline
                    status={activeStreamStatusText || statusText}
                    phase={liveStreamState.phase}
                    step={liveStreamState.step}
                    totalSteps={liveStreamState.totalSteps || 6}
                    meta={liveStreamState.meta}
                    isStreaming={isActiveBoardStreaming}
                    activities={activeStreamActivities}
                    jobInsight={jobInsightState.data}
                    onRefreshJobContext={() => refreshJobInsight({ forceRefresh: true })}
                    onOpenSources={() => setJobInsightDrawerOpen(true)}
                    onJumpToField={handleJumpToField}
                    refreshingJobContext={jobInsightState.status === "loading"}
                    streamError={liveStreamState.error}
                    contractWarning={activeContractWarning}
                  />

                  <DraftLabPanel
                    boardLabel={currentModeLabel}
                    title={dashboardResultTitle}
                    resumeText={activeWorkspace.resume_text}
                    onResumeChange={(value) =>
                      updateWorkspace(activeBoard, (previous) => ({
                        ...previous,
                        resume_text: value,
                      }))
                    }
                    generationMode={activeWorkspace.generation_mode}
                    isStreaming={isActiveBoardStreaming}
                    streamStatus={activeStreamStatusText || statusText}
                    loading={loading}
                    onSaveManualEdit={handleSaveManualEdit}
                    onClearResume={handleClearResume}
                    onExport={handleExport}
                    revisionInstruction={activeWorkspace.revision_instruction}
                    onRevisionInstructionChange={(value) =>
                      updateWorkspace(activeBoard, (previous) => ({
                        ...previous,
                        revision_instruction: value,
                      }))
                    }
                    onReviseWithAI={handleReviseWithAI}
                    onOpenJsonModal={() => setJsonModalOpen(true)}
                    onAbortStream={() => liveStreamAbortRef.current?.abort?.()}
                    analysisCount={activeAnalysisCount}
                    warning={liveStreamState.error || activeContractWarning}
                    onSaveWorkspace={activeBoard === "greenfield" ? handleSaveWorkspace : undefined}
                    onRestoreWorkspaceBackup={
                      activeBoard === "greenfield" ? handleRestoreWorkspaceBackup : undefined
                    }
                    draftSaving={draftSaving}
                    hasSavedBackup={Boolean(memory?.workspace_draft?.form_state)}
                  />
                </div>
              </section>

            </div>
          </div>
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

      <JobInsightDrawer
        open={jobInsightDrawerOpen}
        onClose={() => setJobInsightDrawerOpen(false)}
        jobInsight={jobInsightState.data}
        targetCompany={activeJobInfo?.target_company || ""}
        targetRole={activeJobInfo?.target_role || ""}
      />

      <LiveJsonModal
        open={jsonModalOpen}
        title={`${currentModeLabel} 实时 JSON`}
        subtitle="仅在需要时查看。"
        content={liveJsonContent}
        onClose={() => setJsonModalOpen(false)}
      />

      <WorkspaceHistoryDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        analysisNotes={activeWorkspace.analysis_notes}
        memory={memory}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onPreviewUpload={handlePreviewUpload}
        onDeleteUpload={handleDeleteUpload}
        onPreviewExport={handlePreviewExport}
        onRedownloadExport={handleRedownloadExport}
        onDeleteExport={handleDeleteExport}
      />
    </div>
  );

}
