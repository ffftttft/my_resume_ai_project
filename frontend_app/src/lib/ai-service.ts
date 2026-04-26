import partialParseModule from "partial-json-parser";

import {
  parseExistingResumeOptimizeRequest,
  parseGenerateResumeRequest,
  parsePartialWorkspaceResult,
  parseWorkspaceResult,
} from "../schemas/resume";

const partialParse = partialParseModule.default ?? partialParseModule;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

function validateStreamPayload(path, payload) {
  if (path === "/api/resume/existing/stream") {
    return parseExistingResumeOptimizeRequest(payload);
  }

  return parseGenerateResumeRequest(payload);
}

function parseSseChunk(chunk) {
  const lines = chunk.split("\n");
  let eventName = "message";
  const dataLines = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  try {
    return {
      event: eventName,
      payload: dataLines.length > 0 ? JSON.parse(dataLines.join("\n")) : {},
    };
  } catch {
    return {
      event: eventName,
      payload: {},
    };
  }
}

async function streamWorkspaceResult(
  path,
  payload,
  { onStatus, onPartial, onFinal, onError, signal } = {},
) {
  const validatedPayload = validateStreamPayload(path, payload);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(validatedPayload),
    signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Unable to start structured resume streaming.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rawJson = "";
  let deferredError = null;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const { event, payload: eventPayload } = parseSseChunk(chunk);

      if (event === "status") {
        onStatus?.(eventPayload);
        continue;
      }

      if (event === "partial") {
        rawJson += eventPayload.delta || "";
        try {
          const partial = parsePartialWorkspaceResult(partialParse(rawJson));
          onPartial?.(partial, rawJson);
        } catch {
          onPartial?.(parsePartialWorkspaceResult({}), rawJson);
        }
        continue;
      }

      if (event === "error") {
        const error = new Error(eventPayload?.message || "Structured stream generation failed.");
        deferredError = error;
        continue;
      }

      if (event === "final") {
        try {
          const finalResult = parseWorkspaceResult(eventPayload);
          onFinal?.(finalResult);
          return finalResult;
        } catch (error) {
          const validationError = new Error(
            error instanceof Error
              ? `Final workspace result failed contract validation: ${error.message}`
              : "Final workspace result failed contract validation.",
          );
          onError?.(validationError);
          throw validationError;
        }
      }
    }

    if (done) {
      break;
    }
  }

  if (deferredError) {
    onError?.(deferredError);
    throw deferredError;
  }

  throw new Error("The stream ended before a final structured result arrived.");
}

export async function generateResumeStream(
  payload,
  options = {},
) {
  return streamWorkspaceResult("/api/resume/existing/stream", payload, options);
}

export async function generateGreenfieldResumeStream(
  payload,
  options = {},
) {
  return streamWorkspaceResult("/api/resume/generate/stream", payload, options);
}
