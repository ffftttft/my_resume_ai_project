"""Application configuration loaded from environment variables."""

from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings used by backend services and routers."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_root: Path = Path(__file__).resolve().parents[2]
    memory_file: Path = project_root / "memory.json"
    profile_memory_file: Path = project_root / "profile_memory.json"
    profile_memory_max_bytes: int = 4096
    upload_dir: Path = project_root / "backend" / "uploads"
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    ai_text_provider: str = "deepseek"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-flash"
    hfsy_api_key: str = ""
    hfsy_image_base_url: str = "https://www.hfsyapi.cn/v1"
    hfsy_image_default_model: str = "gpt-image-2"
    resume_template_dir: Path = project_root / "backend" / "assets" / "resume_templates"
    resume_file_template_dir: Path = project_root / "backend" / "assets" / "resume_file_templates"
    generated_resume_image_dir: Path = project_root / "backend" / "generated" / "resume_images"
    generated_resume_file_dir: Path = project_root / "backend" / "generated" / "resume_files"
    generated_resume_file_preview_dir: Path = project_root / "backend" / "generated" / "resume_file_previews"
    umi_ocr_base_url: str = "http://127.0.0.1:1224"
    umi_ocr_exe_path: Path = project_root / ".local_tools" / "umi-ocr" / "runtime" / "Umi-OCR.exe"
    umi_ocr_auto_start: bool = True
    generated_resume_document_dir: Path = project_root / "backend" / "generated" / "resume_documents"
    tavily_api_key: str = ""
    job_search_enabled: bool = True
    job_search_ttl_seconds: int = 1800
    job_search_max_results: int = 3
    rag_enabled: bool = True
    rag_backend: str = "local"
    rag_top_k: int = 3
    rag_reference_dir: Path = project_root / "backend" / "data" / "rag_reference_resumes"
    rag_chroma_persist_dir: Path = project_root / "backend" / "data" / "chromadb"
    default_modules: List[str] = Field(
        default_factory=lambda: [
            "summary",
            "skills",
            "education",
            "projects",
            "experience",
        ]
    )


settings = Settings()
