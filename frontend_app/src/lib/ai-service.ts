import partialParseModule from "partial-json-parser";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { structuredResumeSchema, workspaceResultSchema } from "../schemas/resume";

const partialParse = partialParseModule.default ?? partialParseModule;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

function buildSchemaSnapshot() {
  const candidate = zodToJsonSchema(structuredResumeSchema, "StructuredResume");
  if (candidate?.definitions?.StructuredResume && Object.keys(candidate.definitions.StructuredResume).length > 0) {
    return candidate;
  }

  return z.toJSONSchema(structuredResumeSchema, {
    reused: "ref",
  });
}

function normalizePartialResult(partial) {
  return {
    title: typeof partial?.title === "string" ? partial.title : "",
    analysis_notes: Array.isArray(partial?.analysis_notes) ? partial.analysis_notes : [],
    questions: Array.isArray(partial?.questions) ? partial.questions : [],
    structured_resume:
      partial?.structured_resume && typeof partial.structured_resume === "object"
        ? partial.structured_resume
        : null,
  };
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      schema_snapshot: buildSchemaSnapshot(),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "无法启动简历流式生成。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rawJson = "";
  let deferredError: Error | null = null;

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
          const partial = normalizePartialResult(partialParse(rawJson));
          onPartial?.(partial, rawJson);
        } catch {
          onPartial?.(normalizePartialResult({}), rawJson);
        }
        continue;
      }

      if (event === "error") {
        const error = new Error(eventPayload?.message || "流式生成失败。");
        deferredError = error;
        continue;
      }

      if (event === "final") {
        const finalResult = workspaceResultSchema.parse(eventPayload);
        onFinal?.(finalResult);
        return finalResult;
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

  throw new Error("流式连接已结束，但未收到最终结果。");
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
