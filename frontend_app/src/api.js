// REST API helpers for talking to the local FastAPI backend.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function parseJsonResponse(response) {
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
    throw new Error(detailMessage || payload?.message || "Request failed.");
  }

  return payload.data;
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
    return detailMessage || payload?.message || "Export request failed.";
  } catch {
    const fallbackText = await response.text().catch(() => "");
    return fallbackText || "Export request failed.";
  }
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return parseJsonResponse(response);
}

export async function fetchModelStatus() {
  const response = await fetch(`${API_BASE_URL}/api/model-status`);
  return parseJsonResponse(response);
}

export async function fetchMemory() {
  const response = await fetch(`${API_BASE_URL}/api/memory`);
  return parseJsonResponse(response);
}

export async function saveWorkspaceDraft(payload) {
  const response = await fetch(`${API_BASE_URL}/api/workspace/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function deleteResumeSnapshot(timestamp) {
  const response = await fetch(`${API_BASE_URL}/api/resume/snapshot/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ timestamp }),
  });
  return parseJsonResponse(response);
}

export async function uploadFiles(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
  return parseJsonResponse(response);
}

export async function previewUploadedFile(savedName) {
  const response = await fetch(`${API_BASE_URL}/api/upload/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ saved_name: savedName }),
  });
  return parseJsonResponse(response);
}

export async function deleteUploadedFileRecord(payload) {
  const response = await fetch(`${API_BASE_URL}/api/upload/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function deleteExportRecord(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/export/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function requestClarificationQuestions(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function generateResume(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function reviseResume(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/revise`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function optimizeExistingResume(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/existing/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
}

export async function saveResumeSnapshot(payload) {
  const response = await fetch(`${API_BASE_URL}/api/resume/snapshot/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(response);
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
