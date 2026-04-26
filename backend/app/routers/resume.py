"""Resume-related REST API routes for upload, question generation, drafting, revision, and export."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.models import (
    ApiEnvelope,
    ClarificationRequest,
    DeleteDownloadedArtifactRequest,
    DeleteSnapshotRequest,
    DeleteUploadedFileRequest,
    ExistingResumeOptimizeRequest,
    ExportResumeRequest,
    GenerateResumeRequest,
    JobContextSearchRequest,
    RagSearchRequest,
    ReviseResumeRequest,
    SaveResumeSnapshotRequest,
    SaveWorkspaceRequest,
    SemanticATSScoreRequest,
    UploadedFilePreviewRequest,
)
from app.services.file_service import FileService
from app.services.memory_service import MemoryService
from app.services.resume_service import ResumeService


router = APIRouter(prefix="/api", tags=["resume"])


def _build_download_filename(file_name: str) -> str:
    """Return an RFC 5987 compatible Content-Disposition value."""

    original_name = Path(file_name or "resume").name or "resume"
    file_path = Path(original_name)
    safe_stem = re.sub(r"[^A-Za-z0-9_-]+", "_", file_path.stem or "resume")
    safe_stem = re.sub(r"_+", "_", safe_stem).strip("._") or "resume"
    safe_suffix = file_path.suffix if re.fullmatch(r"\.[A-Za-z0-9]+", file_path.suffix or "") else ""
    safe_ascii = f"{safe_stem}{safe_suffix}"
    encoded = quote(original_name, safe="")
    return f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded}'


def _encode_sse(event: str, payload: dict) -> str:
    """Serialize one server-sent event frame."""

    try:
        body = json.dumps(payload, ensure_ascii=False)
    except TypeError:
        body = json.dumps(
            {
                "message": "Non-serializable payload in SSE stream.",
                "raw": str(payload),
            },
            ensure_ascii=False,
        )
    return f"event: {event}\ndata: {body}\n\n"


def get_resume_service() -> ResumeService:
    """Dependency placeholder replaced from app.main."""

    raise RuntimeError("ResumeService dependency not configured.")


def get_file_service() -> FileService:
    """Dependency placeholder replaced from app.main."""

    raise RuntimeError("FileService dependency not configured.")


def get_memory_service() -> MemoryService:
    """Dependency placeholder replaced from app.main."""

    raise RuntimeError("MemoryService dependency not configured.")


@router.get("/health", response_model=ApiEnvelope)
def health_check(service: ResumeService = Depends(get_resume_service)) -> ApiEnvelope:
    """Simple health endpoint.

    Example:
    - GET /api/health
    """

    return ApiEnvelope(
        data={
            "status": "ok",
            "configured": service.ai_engine.is_available,
            "ai_available": service.ai_engine.is_available,
            "provider": service.ai_engine.provider_name,
            "base_url": service.ai_engine.effective_base_url,
            "model": service.ai_engine.model_name,
            "wire_api": "responses.stream",
        }
    )


@router.get("/model-status", response_model=ApiEnvelope)
def model_status(service: ResumeService = Depends(get_resume_service)) -> ApiEnvelope:
    """Run a lightweight live probe against the configured model provider."""

    return ApiEnvelope(data=service.probe_model_status())


@router.post("/ats/semantic-score", response_model=ApiEnvelope)
def score_semantic_ats(
    payload: SemanticATSScoreRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Return embedding-based ATS scoring with lexical fallback."""

    result = service.score_semantic_ats(
        resume_text=payload.resume_text,
        job_description=payload.job_description,
    )
    return ApiEnvelope(data=result)


@router.post("/rag/search", response_model=ApiEnvelope)
def search_rag_references(
    payload: RagSearchRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Search the local reference-resume corpus for prompt-safe RAG context."""

    result = service.search_rag_references(
        query=payload.query,
        top_k=payload.top_k,
    )
    return ApiEnvelope(data=result)


@router.post("/search/job-context", response_model=ApiEnvelope)
def search_job_context(
    payload: JobContextSearchRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Search live job context from the network for the current target role."""

    result = service.search_job_context(
        target_company=payload.target_company,
        target_role=payload.target_role,
        job_requirements=payload.job_requirements,
        force_refresh=payload.force_refresh,
    )
    return ApiEnvelope(data=result)


@router.get("/memory", response_model=ApiEnvelope)
def read_memory(memory_service: MemoryService = Depends(get_memory_service)) -> ApiEnvelope:
    """Return the current memory.json content to the frontend."""

    return ApiEnvelope(data={"memory": memory_service.load()})


@router.post("/session/reset", response_model=ApiEnvelope)
def reset_ai_session(service: ResumeService = Depends(get_resume_service)) -> ApiEnvelope:
    """Reset the transient AI session and reload the compact persistent user profile memory."""

    return ApiEnvelope(data=service.reset_ai_session_context())


@router.post("/workspace/save", response_model=ApiEnvelope)
def save_workspace(
    payload: SaveWorkspaceRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Save the current frontend workspace for later recovery."""

    saved = service.save_workspace_draft(payload.model_dump())
    return ApiEnvelope(data={"saved_at": saved.get("saved_at"), "workspace_draft": saved})


@router.post("/resume/snapshot/delete", response_model=ApiEnvelope)
def delete_resume_snapshot(
    payload: DeleteSnapshotRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Delete one saved resume snapshot from memory.json."""

    deleted = service.delete_resume_snapshot(payload.timestamp)
    return ApiEnvelope(data={"deleted": deleted, "timestamp": payload.timestamp})


@router.post("/upload/preview", response_model=ApiEnvelope)
def preview_uploaded_file(
    payload: UploadedFilePreviewRequest,
    file_service: FileService = Depends(get_file_service),
) -> ApiEnvelope:
    """Preview one uploaded file by re-extracting its text from disk."""

    try:
        preview = file_service.preview_saved_file(payload.saved_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ApiEnvelope(data=preview)


@router.post("/upload/delete", response_model=ApiEnvelope)
def delete_uploaded_file(
    payload: DeleteUploadedFileRequest,
    file_service: FileService = Depends(get_file_service),
    memory_service: MemoryService = Depends(get_memory_service),
) -> ApiEnvelope:
    """Delete one uploaded-file record and its saved local file when present."""

    deleted = memory_service.delete_uploaded_file(
        saved_name=payload.saved_name,
        timestamp=payload.timestamp,
    )
    if deleted and payload.saved_name:
        file_service.delete_saved_file(payload.saved_name)
    return ApiEnvelope(
        data={
            "deleted": deleted,
            "saved_name": payload.saved_name,
            "timestamp": payload.timestamp,
        }
    )


@router.post("/upload", response_model=ApiEnvelope)
async def upload_files(
    files: List[UploadFile] = File(...),
    file_service: FileService = Depends(get_file_service),
    memory_service: MemoryService = Depends(get_memory_service),
) -> ApiEnvelope:
    """Upload and parse optional supporting files.

    Example:
    - FormData with files[]=portfolio.pdf
    """

    summaries = []
    combined_context_parts = []

    for upload in files:
        summary = file_service.process_upload(upload)
        combined_context_parts.append(summary["full_text"])
        memory_service.register_upload(
            {
                "original_name": summary["original_name"],
                "saved_name": summary["saved_name"],
                "file_type": summary["file_type"],
                "todo_notice": summary["todo_notice"],
            }
        )
        summaries.append(summary)

    return ApiEnvelope(
        data={
            "files": summaries,
            "combined_context": "\n\n".join(part for part in combined_context_parts if part).strip(),
        }
    )


@router.post("/resume/questions", response_model=ApiEnvelope)
def create_clarification_questions(
    payload: ClarificationRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Ask AI for the missing information needed before drafting a stronger resume."""

    result = service.generate_questions(payload.profile)
    return ApiEnvelope(data=result)


@router.post("/resume/generate", response_model=ApiEnvelope)
def generate_resume(
    payload: GenerateResumeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Generate a resume draft from the collected profile information."""

    result = service.generate_resume(payload.profile)
    return ApiEnvelope(data=result)


@router.post("/resume/generate/stream")
def stream_generate_resume(
    payload: GenerateResumeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> StreamingResponse:
    """Stream structured events for new resume generation."""

    def event_stream():
        try:
            for event in service.stream_generate_resume(payload.profile):
                yield _encode_sse(event.get("event", "message"), event.get("data") or {})
        except Exception as exc:
            yield _encode_sse("error", {"message": f"SSE stream crashed: {exc}"})

    response = StreamingResponse(event_stream(), media_type="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@router.post("/resume/revise", response_model=ApiEnvelope)
def revise_resume(
    payload: ReviseResumeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Revise a resume after the user manually edits content or adds instructions."""

    result = service.revise_resume(
        profile=payload.profile,
        resume_text=payload.resume_text,
        instruction=payload.instruction,
    )
    return ApiEnvelope(data=result)


@router.post("/resume/existing/optimize", response_model=ApiEnvelope)
def optimize_existing_resume(
    payload: ExistingResumeOptimizeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Optimize an uploaded resume against job information and return follow-up questions."""

    result = service.optimize_existing_resume(payload.model_dump())
    return ApiEnvelope(data=result)


@router.post("/resume/existing/stream")
def stream_existing_resume(
    payload: ExistingResumeOptimizeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> StreamingResponse:
    """Stream structured optimization events for an uploaded resume."""

    def event_stream():
        try:
            for event in service.stream_existing_resume(payload.model_dump()):
                yield _encode_sse(event.get("event", "message"), event.get("data") or {})
        except Exception as exc:
            yield _encode_sse("error", {"message": f"SSE stream crashed: {exc}"})

    response = StreamingResponse(event_stream(), media_type="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@router.post("/resume/snapshot/save", response_model=ApiEnvelope)
def save_resume_snapshot(
    payload: SaveResumeSnapshotRequest,
    service: ResumeService = Depends(get_resume_service),
) -> ApiEnvelope:
    """Save the current resume editor content as a manual snapshot."""

    result = service.save_resume_snapshot(payload.model_dump())
    return ApiEnvelope(data=result)


@router.post("/resume/export/delete", response_model=ApiEnvelope)
def delete_export_record(
    payload: DeleteDownloadedArtifactRequest,
    memory_service: MemoryService = Depends(get_memory_service),
) -> ApiEnvelope:
    """Delete one exported artifact record from memory.json."""

    deleted = memory_service.delete_downloaded_artifact(
        file_name=payload.file_name,
        timestamp=payload.timestamp,
    )
    return ApiEnvelope(
        data={
            "deleted": deleted,
            "file_name": payload.file_name,
            "timestamp": payload.timestamp,
        }
    )


@router.post("/resume/export")
def export_resume(
    payload: ExportResumeRequest,
    service: ResumeService = Depends(get_resume_service),
) -> StreamingResponse:
    """Stream a Markdown or TXT export and record the download in memory.json."""

    result = service.export_resume(
        resume_text=payload.resume_text,
        file_name=payload.file_name,
        format_name=payload.format,
    )
    response = StreamingResponse(result["content"], media_type=result["media_type"])
    response.headers["Content-Disposition"] = _build_download_filename(result["file_name"])
    return response
