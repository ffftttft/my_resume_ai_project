// REST API helpers for talking to the local FastAPI backend.

import {
  parseClarificationRequest,
  parseExistingResumeOptimizeRequest,
  parseGenerateResumeRequest,
  parseJobContextSearchRequest,
  parseJobContextSearchResponse,
  parseRagSearchRequest,
  parseRagSearchResponse,
  parseReviseResumeRequest,
  parseSaveResumeSnapshotRequest,
  parseSemanticAtsScore,
  parseSemanticAtsScoreRequest,
  parseWorkspaceResult,
} from "./schemas/resume";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

function toApiUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function toUserFacingNetworkMessage(error) {
  const message = String(error?.message || "");
  if (
    error instanceof TypeError ||
    /Failed to fetch|Load failed|NetworkError|ERR_CONNECTION_REFUSED|fetch/i.test(message)
  ) {
    return "本地后端未启动或 8000 端口不可用，请先启动后端服务。";
  }
  return message || "请求失败，请稍后重试。";
}

async function requestJson(path, options = {}, parser) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    throw new Error(toUserFacingNetworkMessage(error));
  }

  return parseJsonResponse(response, parser);
}

async function parseJsonResponse(response, parser) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.ok === false) {
    const detailMessage = Array.isArray(payload?.detail)
      ? payload.detail
          .map((item) => item?.msg || item?.message)
          .filter(Boolean)
          .join("; ")
      : payload?.detail;
    throw new Error(detailMessage || payload?.message || "请求失败，请稍后重试。");
  }

  return parser ? parser(payload.data) : payload.data;
}

function extractFileNameFromDisposition(disposition, fallback = "resume.md") {
  if (!disposition) return fallback;

  const encodedMatch = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const plainMatch = disposition.match(/filename="(.+?)"/i);
  return plainMatch?.[1] || fallback;
}

async function parseExportError(response) {
  try {
    const payload = await response.json();
    const detailMessage = Array.isArray(payload?.detail)
      ? payload.detail
          .map((item) => item?.msg || item?.message)
          .filter(Boolean)
          .join("; ")
      : payload?.detail;
    return detailMessage || payload?.message || "导出失败，请稍后重试。";
  } catch {
    const fallbackText = await response.text().catch(() => "");
    return fallbackText || "导出失败，请稍后重试。";
  }
}

export async function fetchHealth() {
  return requestJson("/api/health");
}

export async function fetchModelStatus() {
  return requestJson("/api/model-status");
}

export async function fetchResumeImageTemplates() {
  const data = await requestJson("/api/resume/image/templates");
  return {
    ...data,
    templates: (data.templates || []).map((template) => ({
      ...template,
      preview_url: toApiUrl(template.preview_url),
    })),
  };
}

export async function fetchResumeFileTemplates() {
  const data = await requestJson("/api/resume/file/templates");
  return {
    ...data,
    templates: (data.templates || []).map((template) => ({
      ...template,
      preview_url: toApiUrl(template.preview_url),
    })),
  };
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await requestJson("/api/avatar/upload", {
    method: "POST",
    body: formData,
  });
  return {
    ...data,
    preview_url: toApiUrl(data.preview_url),
  };
}

export async function generateResumeImage(payload) {
  const data = await requestJson("/api/resume/image/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return {
    ...data,
    preview_url: toApiUrl(data.preview_url),
  };
}

export async function generateResumeFile(payload) {
  const data = await requestJson("/api/resume/file/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return {
    ...data,
    preview_url: toApiUrl(data.preview_url),
    download_url: toApiUrl(data.download_url),
  };
}

export async function downloadResumeFile(savedName) {
  const encodedName = encodeURIComponent(savedName || "");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/resume/file/generated/${encodedName}`);
  } catch (error) {
    throw new Error(toUserFacingNetworkMessage(error));
  }

  if (!response.ok) {
    throw new Error(await parseExportError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  return {
    blob,
    fileName: extractFileNameFromDisposition(disposition, savedName || "resume.docx"),
  };
}

export async function exportResumeImageWord(payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/resume/image/ocr-word`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(toUserFacingNetworkMessage(error));
  }

  if (!response.ok) {
    throw new Error(await parseExportError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const savedName = response.headers.get("X-Generated-Document-Name") || "";
  return {
    blob,
    fileName: extractFileNameFromDisposition(disposition, "resume-image-ocr.docx"),
    savedName,
    download_url: savedName ? toApiUrl(`/api/resume/image/ocr-word/${encodeURIComponent(savedName)}`) : "",
    blockCount: Number(response.headers.get("X-OCR-Block-Count") || 0),
    lowConfidenceCount: Number(response.headers.get("X-OCR-Low-Confidence-Count") || 0),
  };
}

export async function downloadResumeImageWord(savedName) {
  const encodedName = encodeURIComponent(savedName || "");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/resume/image/ocr-word/${encodedName}`);
  } catch (error) {
    throw new Error(toUserFacingNetworkMessage(error));
  }

  if (!response.ok) {
    throw new Error(await parseExportError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  return {
    blob,
    fileName: extractFileNameFromDisposition(disposition, savedName || "resume-image-ocr.docx"),
  };
}

export async function scoreSemanticAts(payload) {
  const validatedPayload = parseSemanticAtsScoreRequest(payload);
  return requestJson("/api/ats/semantic-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseSemanticAtsScore);
}

export async function searchRagReferences(payload) {
  const validatedPayload = parseRagSearchRequest(payload);
  return requestJson("/api/rag/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseRagSearchResponse);
}

export async function searchJobContext(payload) {
  const validatedPayload = parseJobContextSearchRequest(payload);
  return requestJson("/api/search/job-context", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseJobContextSearchResponse);
}

export async function fetchMemory() {
  return requestJson("/api/memory");
}

export async function resetAiSession() {
  return requestJson("/api/session/reset", {
    method: "POST",
  });
}

export async function saveWorkspaceDraft(payload) {
  return requestJson("/api/workspace/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteResumeSnapshot(timestamp) {
  return requestJson("/api/resume/snapshot/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ timestamp }),
  });
}

export async function uploadFiles(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  return requestJson("/api/upload", {
    method: "POST",
    body: formData,
  });
}

export async function previewUploadedFile(savedName) {
  return requestJson("/api/upload/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ saved_name: savedName }),
  });
}

export async function deleteUploadedFileRecord(payload) {
  return requestJson("/api/upload/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteExportRecord(payload) {
  return requestJson("/api/resume/export/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function requestClarificationQuestions(payload) {
  const validatedPayload = parseClarificationRequest(payload);
  return requestJson("/api/resume/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  });
}

export async function generateResume(payload) {
  const validatedPayload = parseGenerateResumeRequest(payload);
  return requestJson("/api/resume/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseWorkspaceResult);
}

export async function reviseResume(payload) {
  const validatedPayload = parseReviseResumeRequest(payload);
  return requestJson("/api/resume/revise", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseWorkspaceResult);
}

export async function optimizeExistingResume(payload) {
  const validatedPayload = parseExistingResumeOptimizeRequest(payload);
  return requestJson("/api/resume/existing/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  }, parseWorkspaceResult);
}

export async function saveResumeSnapshot(payload) {
  const validatedPayload = parseSaveResumeSnapshotRequest(payload);
  return requestJson("/api/resume/snapshot/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
  });
}

export async function exportResumeFile(payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/resume/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(error?.message || "Unable to reach export endpoint.");
  }

  if (!response.ok) {
    throw new Error(await parseExportError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  return {
    blob,
    fileName: extractFileNameFromDisposition(disposition, "resume.md"),
  };
}
