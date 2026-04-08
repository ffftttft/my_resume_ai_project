"""Persistent memory service that reads and updates the root memory.json file."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict


class MemoryService:
    """Read/write helper around memory.json with simple thread-safe updates."""

    def __init__(self, memory_file: Path):
        self.memory_file = memory_file
        self._lock = Lock()
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file()

    @staticmethod
    def _now() -> str:
        """Return an ISO timestamp for audit records."""

        return datetime.now().astimezone().isoformat()

    def _default_payload(self) -> Dict[str, Any]:
        """Default structure created when memory.json does not exist yet."""

        return {
            "note": "Local persistent memory for my_resume_ai_project.",
            "project_name": "my_resume_ai_project",
            "created_at": self._now(),
            "last_started_at": None,
            "workspace_draft": None,
            "generated_modules": [],
            "uploaded_files": [],
            "downloaded_artifacts": [],
            "generation_history": [],
            "resume_snapshots": [],
            "sessions": [],
        }

    def _ensure_file(self) -> None:
        """Create memory.json if missing."""

        if not self.memory_file.exists():
            self.memory_file.write_text(
                json.dumps(self._default_payload(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def load(self) -> Dict[str, Any]:
        """Load the current memory payload from disk."""

        with self._lock:
            return json.loads(self.memory_file.read_text(encoding="utf-8"))

    def save(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Persist a full memory payload back to disk."""

        with self._lock:
            self.memory_file.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        return payload

    def touch_startup(self) -> Dict[str, Any]:
        """Record backend startup time so the next launch knows the service history."""

        payload = self.load()
        timestamp = self._now()
        payload["last_started_at"] = timestamp
        payload["sessions"].append({"event": "backend_startup", "timestamp": timestamp})
        return self.save(payload)

    def ensure_generated_module(
        self,
        module_name: str,
        category: str,
        path: str,
        details: str,
    ) -> Dict[str, Any]:
        """Register a generated module once and avoid duplicates by module name + path."""

        payload = self.load()
        exists = any(
            item["module_name"] == module_name and item["path"] == path
            for item in payload["generated_modules"]
        )
        if not exists:
            payload["generated_modules"].append(
                {
                    "module_name": module_name,
                    "category": category,
                    "path": path,
                    "generated_at": self._now(),
                    "details": details,
                }
            )
        return self.save(payload)

    def register_upload(self, upload_record: Dict[str, Any]) -> Dict[str, Any]:
        """Append an uploaded file record."""

        payload = self.load()
        upload_record["timestamp"] = self._now()
        payload["uploaded_files"].append(upload_record)
        return self.save(payload)

    def register_generation(self, generation_record: Dict[str, Any]) -> Dict[str, Any]:
        """Append a resume generation event and keep a latest snapshot."""

        payload = self.load()
        generation_record["timestamp"] = self._now()
        payload["generation_history"].append(generation_record)
        if generation_record.get("event") in {
            "resume_generated",
            "resume_revised",
            "existing_resume_optimized",
        }:
            payload["resume_snapshots"].append(
                {
                    "timestamp": generation_record["timestamp"],
                    "target_company": generation_record.get("target_company", ""),
                    "target_role": generation_record.get("target_role", ""),
                    "resume_text": generation_record.get("resume_text", ""),
                    "generation_mode": generation_record.get("generation_mode", "fallback"),
                }
            )
        return self.save(payload)

    def register_download(self, download_record: Dict[str, Any]) -> Dict[str, Any]:
        """Append a download/export event."""

        payload = self.load()
        download_record["timestamp"] = self._now()
        payload["downloaded_artifacts"].append(download_record)
        return self.save(payload)

    def save_workspace_draft(self, draft_record: Dict[str, Any]) -> Dict[str, Any]:
        """Persist the latest workspace draft for later recovery."""

        payload = self.load()
        payload["workspace_draft"] = {
            **draft_record,
            "saved_at": self._now(),
        }
        self.save(payload)
        return payload["workspace_draft"]

    def save_resume_snapshot(self, snapshot_record: Dict[str, Any]) -> Dict[str, Any]:
        """Persist one resume snapshot created from the left editor."""

        payload = self.load()
        snapshot = {
            "timestamp": self._now(),
            "target_company": snapshot_record.get("target_company", ""),
            "target_role": snapshot_record.get("target_role", ""),
            "resume_text": snapshot_record.get("resume_text", ""),
            "generation_mode": snapshot_record.get("generation_mode", "manual_preserve"),
        }
        payload["resume_snapshots"].append(snapshot)
        self.save(payload)
        return snapshot

    def delete_resume_snapshot(self, timestamp: str) -> bool:
        """Delete one saved resume snapshot by timestamp."""

        payload = self.load()
        original_count = len(payload["resume_snapshots"])
        payload["resume_snapshots"] = [
            item for item in payload["resume_snapshots"] if item.get("timestamp") != timestamp
        ]
        if len(payload["resume_snapshots"]) == original_count:
            return False
        self.save(payload)
        return True

    def delete_uploaded_file(self, saved_name: str = "", timestamp: str = "") -> bool:
        """Delete one uploaded-file record by saved file name and/or timestamp."""

        payload = self.load()
        original_count = len(payload["uploaded_files"])
        payload["uploaded_files"] = [
            item
            for item in payload["uploaded_files"]
            if not (
                (saved_name and item.get("saved_name") == saved_name)
                or (timestamp and item.get("timestamp") == timestamp)
            )
        ]
        if len(payload["uploaded_files"]) == original_count:
            return False
        self.save(payload)
        return True

    def delete_downloaded_artifact(self, file_name: str = "", timestamp: str = "") -> bool:
        """Delete one exported-file record by file name and/or timestamp."""

        payload = self.load()
        original_count = len(payload["downloaded_artifacts"])
        payload["downloaded_artifacts"] = [
            item
            for item in payload["downloaded_artifacts"]
            if not (
                (file_name and item.get("file_name") == file_name)
                or (timestamp and item.get("timestamp") == timestamp)
            )
        ]
        if len(payload["downloaded_artifacts"]) == original_count:
            return False
        self.save(payload)
        return True
