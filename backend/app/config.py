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
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-5.4-mini"
    openai_embeddings_enabled: bool = True
    openai_embedding_api_key: str = ""
    openai_embedding_base_url: str = ""
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_provider_cooldown_seconds: int = 180
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
