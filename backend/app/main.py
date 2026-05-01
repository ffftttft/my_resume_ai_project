"""FastAPI application entrypoint for the local AI resume generator."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_modules.engine_v3 import ResumeAIEngine
from app.config import settings
from app.routers import resume as resume_router
from app.services.embedding_service import EmbeddingService
from app.services.file_service import FileService
from app.services.job_search_service import JobSearchService
from app.services.memory_service import MemoryService
from app.services.profile_memory_service import ProfileMemoryService
from app.services.rag_service import RagService
from app.services.resume_docx_template_service import ResumeDocxTemplateService
from app.services.resume_image_service import ResumeImageService
from app.services.resume_service import ResumeService
from app.services.semantic_ats_service import SemanticATSService
from app.services.umi_ocr_service import UmiOcrService


memory_service = MemoryService(settings.memory_file)
profile_memory_service = ProfileMemoryService(
    settings.profile_memory_file,
    max_bytes=settings.profile_memory_max_bytes,
)
file_service = FileService(settings.upload_dir)
resume_image_service = ResumeImageService(
    api_key=settings.hfsy_api_key,
    base_url=settings.hfsy_image_base_url,
    default_model=settings.hfsy_image_default_model,
    template_dir=settings.resume_template_dir,
    generated_dir=settings.generated_resume_image_dir,
    project_root=settings.project_root,
)
resume_docx_template_service = ResumeDocxTemplateService(
    template_dir=settings.resume_file_template_dir,
    generated_dir=settings.generated_resume_file_dir,
    preview_dir=settings.generated_resume_file_preview_dir,
    avatar_dir=settings.generated_resume_image_dir.parent / "avatars",
    project_root=settings.project_root,
    soffice_path=settings.soffice_path,
    preview_dpi=settings.docx_preview_dpi,
)
umi_ocr_service = UmiOcrService(
    base_url=settings.umi_ocr_base_url,
    exe_path=settings.umi_ocr_exe_path,
    auto_start=settings.umi_ocr_auto_start,
    document_dir=settings.generated_resume_document_dir,
    project_root=settings.project_root,
)
ai_engine = ResumeAIEngine(
    api_key=settings.deepseek_api_key,
    base_url=settings.deepseek_base_url,
    model_name=settings.deepseek_model,
    provider_label="DeepSeek",
)
# Embedding service disabled - not used in current workflow
embedding_service = EmbeddingService(
    api_key="",
    base_url="",
    model_name="",
    enabled=False,
    cooldown_seconds=180,
)
rag_service = RagService(
    embedding_service=embedding_service,
    reference_dir=settings.rag_reference_dir,
    top_k=settings.rag_top_k,
    enabled=settings.rag_enabled,
    backend=settings.rag_backend,
    chroma_persist_dir=settings.rag_chroma_persist_dir,
)
job_search_service = JobSearchService(
    api_key=settings.tavily_api_key,
    enabled=settings.job_search_enabled,
    ttl_seconds=settings.job_search_ttl_seconds,
    max_results=settings.job_search_max_results,
)
semantic_ats_service = SemanticATSService(embedding_service=embedding_service)
resume_service = ResumeService(
    memory_service=memory_service,
    profile_memory_service=profile_memory_service,
    ai_engine=ai_engine,
    semantic_ats_service=semantic_ats_service,
    rag_service=rag_service,
    job_search_service=job_search_service,
)

app = FastAPI(
    title="My Resume AI Project Backend",
    description="Local FastAPI backend for AI-driven resume generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Disposition",
        "X-OCR-Block-Count",
        "X-OCR-Low-Confidence-Count",
        "X-Generated-Document-Name",
    ],
)


def _provide_resume_service() -> ResumeService:
    """FastAPI dependency provider for the resume service."""

    return resume_service


def _provide_file_service() -> FileService:
    """FastAPI dependency provider for file upload processing."""

    return file_service


def _provide_memory_service() -> MemoryService:
    """FastAPI dependency provider for the memory layer."""

    return memory_service


def _provide_resume_image_service() -> ResumeImageService:
    """FastAPI dependency provider for resume image generation."""

    return resume_image_service


def _provide_resume_docx_template_service() -> ResumeDocxTemplateService:
    """FastAPI dependency provider for DOCX-template resume generation."""

    return resume_docx_template_service


def _provide_umi_ocr_service() -> UmiOcrService:
    """FastAPI dependency provider for OCR Word export."""

    return umi_ocr_service


app.dependency_overrides[resume_router.get_resume_service] = _provide_resume_service
app.dependency_overrides[resume_router.get_file_service] = _provide_file_service
app.dependency_overrides[resume_router.get_memory_service] = _provide_memory_service
app.dependency_overrides[resume_router.get_resume_image_service] = _provide_resume_image_service
app.dependency_overrides[resume_router.get_resume_docx_template_service] = _provide_resume_docx_template_service
app.dependency_overrides[resume_router.get_umi_ocr_service] = _provide_umi_ocr_service
app.include_router(resume_router.router)


@app.on_event("startup")
def on_startup() -> None:
    """Read memory.json on startup and make sure scaffold entries exist."""

    memory_service.touch_startup()
    resume_service.reset_ai_session_context()
    resume_service.seed_project_modules()
