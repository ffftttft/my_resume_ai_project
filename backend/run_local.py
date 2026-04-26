"""Entry point for launching the FastAPI backend from the project root."""

import os
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    # Add the project root so `ai_modules` is importable when running `python backend/run_local.py`.
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import settings  # noqa: E402

import uvicorn  # noqa: E402


if __name__ == "__main__":
    # Example: python backend/run_local.py
    reload_enabled = os.getenv("RESUME_BACKEND_RELOAD", "").strip().lower() in {"1", "true", "yes"}
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=reload_enabled,
    )
