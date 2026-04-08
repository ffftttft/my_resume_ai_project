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
    upload_dir: Path = project_root / "backend" / "uploads"
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-5.4-mini"
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
