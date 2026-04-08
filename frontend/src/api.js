// REST API helpers for talking to the local FastAPI backend.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function parseJsonResponse(response) {
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Request failed.");
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

export async function fetchHealth() {
  // Example: const health = await fetchHealth();
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return parseJsonResponse(response);
}

export async function fetchModelStatus() {
  // Example: const status = await fetchModelStatus();
  const response = await fetch(`${API_BASE_URL}/api/model-status`);
  return parseJsonResponse(response);
}

export async function fetchMemory() {
  // Example: const { memory } = await fetchMemory();
  const response = await fetch(`${API_BASE_URL}/api/memory`);
  return parseJsonResponse(response);
}

export async function saveWorkspaceDraft(payload) {
  // Example: await saveWorkspaceDraft({ form_state, source: "manual" });
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
  // Example: await deleteResumeSnapshot("2026-04-07T23:00:00+08:00");
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
  // Example: await uploadFiles(fileInput.files);
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });
  return parseJsonResponse(response);
}

export async function requestClarificationQuestions(payload) {
  // Example: await requestClarificationQuestions({ profile });
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
  // Example: await generateResume({ profile });
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
  // Example: await reviseResume({ profile, resume_text, instruction });
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
  // Example: await optimizeExistingResume({ resume_text, target_company, target_role, job_requirements });
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
  // Example: await saveResumeSnapshot({ target_company, target_role, resume_text, generation_mode });
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
  // Example: await exportResumeFile({ resume_text, file_name: "resume", format: "md" });
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
    throw new Error(error?.message || "无法连接导出接口。");
  }

  if (!response.ok) {
    throw new Error("导出接口返回异常。");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  return {
    blob,
    fileName: extractFileNameFromDisposition(disposition, "resume.md"),
  };
}
