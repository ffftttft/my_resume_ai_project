"""FastAPI application entrypoint for the local AI resume generator."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_modules.engine_v3 import ResumeAIEngine
from app.config import settings
from app.routers import resume as resume_router
from app.services.file_service import FileService
from app.services.memory_service import MemoryService
from app.services.profile_memory_service import ProfileMemoryService
from app.services.resume_service import ResumeService


memory_service = MemoryService(settings.memory_file)
profile_memory_service = ProfileMemoryService(
    settings.profile_memory_file,
    max_bytes=settings.profile_memory_max_bytes,
)
file_service = FileService(settings.upload_dir)
ai_engine = ResumeAIEngine(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url,
    model_name=settings.openai_model,
)
resume_service = ResumeService(
    memory_service=memory_service,
    profile_memory_service=profile_memory_service,
    ai_engine=ai_engine,
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
    expose_headers=["Content-Disposition"],
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


app.dependency_overrides[resume_router.get_resume_service] = _provide_resume_service
app.dependency_overrides[resume_router.get_file_service] = _provide_file_service
app.dependency_overrides[resume_router.get_memory_service] = _provide_memory_service
app.include_router(resume_router.router)


@app.on_event("startup")
def on_startup() -> None:
    """Read memory.json on startup and make sure scaffold entries exist."""

    memory_service.touch_startup()
    resume_service.reset_ai_session_context()
    resume_service.seed_project_modules()
