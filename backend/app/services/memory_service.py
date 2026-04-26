"""Compact persistent memory service for the root memory.json file."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict


class MemoryService:
    """Keep memory.json small, readable, and stable across sessions."""

    upload_history_limit = 8
    download_history_limit = 8
    snapshot_history_limit = 8

    def __init__(self, memory_file: Path):
        self.memory_file = memory_file
        self._lock = Lock()
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file()

    @staticmethod
    def _now() -> str:
        """Return an ISO timestamp."""

        return datetime.now().astimezone().isoformat()

    @staticmethod
    def _compact_text(value: Any, limit: int) -> str:
        """Normalize text values stored in memory.json."""

        text = str(value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
        return text[:limit]

    def _default_payload(self) -> Dict[str, Any]:
        """Default structure created when memory.json does not exist yet."""

        return {
            "note": "Compact local memory for my_resume_ai_project.",
            "project_name": "my_resume_ai_project",
            "created_at": self._now(),
            "last_started_at": None,
            "workspace_draft": None,
            "uploaded_files": [],
            "downloaded_artifacts": [],
            "resume_snapshots": [],
        }

    def _ensure_file(self) -> None:
        """Create memory.json if missing."""

        if not self.memory_file.exists():
            self.memory_file.write_text(
                json.dumps(self._default_payload(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def _normalize_workspace_draft(self, draft: Any) -> Dict[str, Any] | None:
        """Keep only the latest recoverable workspace draft."""

        if not isinstance(draft, dict):
            return None

        form_state = draft.get("form_state")
        if not isinstance(form_state, dict):
            return None

        return {
            "form_state": form_state,
            "source": self._compact_text(draft.get("source") or "manual", 24) or "manual",
            "saved_at": self._compact_text(draft.get("saved_at"), 64) or self._now(),
        }

    def _normalize_upload_record(self, record: Any) -> Dict[str, Any] | None:
        """Keep only fields the frontend uses for uploaded-file history."""

        if not isinstance(record, dict):
            return None

        saved_name = self._compact_text(record.get("saved_name"), 128)
        original_name = self._compact_text(record.get("original_name"), 256)
        file_type = self._compact_text(record.get("file_type"), 16)
        timestamp = self._compact_text(record.get("timestamp"), 64)

        if not (saved_name or original_name or timestamp):
            return None

        return {
            "original_name": original_name,
            "saved_name": saved_name,
            "file_type": file_type,
            "todo_notice": self._compact_text(record.get("todo_notice"), 240) or None,
            "timestamp": timestamp or self._now(),
        }

    def _normalize_download_record(self, record: Any) -> Dict[str, Any] | None:
        """Keep only fields the frontend uses for export history."""

        if not isinstance(record, dict):
            return None

        file_name = self._compact_text(record.get("file_name"), 256)
        timestamp = self._compact_text(record.get("timestamp"), 64)
        if not (file_name or timestamp):
            return None

        size_bytes = record.get("size_bytes")
        if not isinstance(size_bytes, int):
            size_bytes = None

        return {
            "file_name": file_name,
            "format": self._compact_text(record.get("format"), 16),
            "size_bytes": size_bytes,
            "resume_text": self._compact_text(record.get("resume_text"), 20000),
            "timestamp": timestamp or self._now(),
        }

    def _normalize_analysis_notes(self, value: Any) -> list[str]:
        """Keep only compact generation notes used in the history drawer."""

        if not isinstance(value, list):
            return []

        normalized: list[str] = []
        for item in value:
            note = self._compact_text(item, 320)
            if note and note not in normalized:
                normalized.append(note)
        return normalized[:8]

    def _normalize_snapshot_record(self, record: Any) -> Dict[str, Any] | None:
        """Keep only fields needed to restore or review a saved resume snapshot."""

        if not isinstance(record, dict):
            return None

        timestamp = self._compact_text(record.get("timestamp"), 64)
        resume_text = self._compact_text(record.get("resume_text"), 20000)
        if not (timestamp or resume_text):
            return None

        return {
            "timestamp": timestamp or self._now(),
            "title": self._compact_text(record.get("title"), 180),
            "target_company": self._compact_text(record.get("target_company"), 120),
            "target_role": self._compact_text(record.get("target_role"), 120),
            "resume_text": resume_text,
            "generation_mode": self._compact_text(record.get("generation_mode"), 48) or "fallback",
            "analysis_notes": self._normalize_analysis_notes(record.get("analysis_notes")),
        }

    def _normalize_recent_records(
        self,
        items: Any,
        normalizer,
        limit: int,
    ) -> list[Dict[str, Any]]:
        """Normalize a record list and keep only the latest entries."""

        normalized: list[Dict[str, Any]] = []
        for item in items or []:
            record = normalizer(item)
            if record:
                normalized.append(record)
        return normalized[-limit:]

    def _normalize_payload(self, payload: Dict[str, Any] | None) -> Dict[str, Any]:
        """Drop legacy keys and rebuild the compact memory shape."""

        source = payload if isinstance(payload, dict) else {}
        base = self._default_payload()
        return {
            "note": self._compact_text(source.get("note") or base["note"], 240) or base["note"],
            "project_name": self._compact_text(source.get("project_name") or base["project_name"], 80)
            or base["project_name"],
            "created_at": self._compact_text(source.get("created_at"), 64) or base["created_at"],
            "last_started_at": self._compact_text(source.get("last_started_at"), 64) or None,
            "workspace_draft": self._normalize_workspace_draft(source.get("workspace_draft")),
            "uploaded_files": self._normalize_recent_records(
                source.get("uploaded_files"),
                self._normalize_upload_record,
                self.upload_history_limit,
            ),
            "downloaded_artifacts": self._normalize_recent_records(
                source.get("downloaded_artifacts"),
                self._normalize_download_record,
                self.download_history_limit,
            ),
            "resume_snapshots": self._normalize_recent_records(
                source.get("resume_snapshots"),
                self._normalize_snapshot_record,
                self.snapshot_history_limit,
            ),
        }

    def load(self) -> Dict[str, Any]:
        """Load the current normalized memory payload from disk."""

        with self._lock:
            try:
                raw_payload = json.loads(self.memory_file.read_text(encoding="utf-8"))
            except Exception:
                raw_payload = self._default_payload()
                self.memory_file.write_text(
                    json.dumps(raw_payload, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            return self._normalize_payload(raw_payload)

    def save(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Persist a normalized memory payload back to disk."""

        normalized = self._normalize_payload(payload)
        with self._lock:
            self.memory_file.write_text(
                json.dumps(normalized, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        return normalized

    def touch_startup(self) -> Dict[str, Any]:
        """Update the last backend startup time."""

        payload = self.load()
        payload["last_started_at"] = self._now()
        return self.save(payload)

    def ensure_generated_module(
        self,
        module_name: str,
        category: str,
        path: str,
        details: str,
    ) -> Dict[str, Any]:
        """Compatibility no-op for legacy module-registration calls."""

        _ = (module_name, category, path, details)
        return self.load()

    def register_upload(self, upload_record: Dict[str, Any]) -> Dict[str, Any]:
        """Append a compact uploaded-file record."""

        payload = self.load()
        payload["uploaded_files"].append(
            {
                "original_name": upload_record.get("original_name", ""),
                "saved_name": upload_record.get("saved_name", ""),
                "file_type": upload_record.get("file_type", ""),
                "todo_notice": upload_record.get("todo_notice"),
                "timestamp": self._now(),
            }
        )
        return self.save(payload)

    def register_generation(self, generation_record: Dict[str, Any]) -> Dict[str, Any]:
        """Store only user-visible resume snapshots from generation events."""

        payload = self.load()
        if generation_record.get("event") in {
            "resume_generated",
            "resume_revised",
            "existing_resume_optimized",
            "resume_streamed",
            "existing_resume_streamed",
        }:
            payload["resume_snapshots"].append(
                {
                    "timestamp": self._now(),
                    "title": generation_record.get("title", ""),
                    "target_company": generation_record.get("target_company", ""),
                    "target_role": generation_record.get("target_role", ""),
                    "resume_text": generation_record.get("resume_text", ""),
                    "generation_mode": generation_record.get("generation_mode", "fallback"),
                    "analysis_notes": generation_record.get("analysis_notes") or [],
                }
            )
        return self.save(payload)

    def register_download(self, download_record: Dict[str, Any]) -> Dict[str, Any]:
        """Append a compact download/export record."""

        payload = self.load()
        payload["downloaded_artifacts"].append(
            {
                "file_name": download_record.get("file_name", ""),
                "format": download_record.get("format", ""),
                "size_bytes": download_record.get("size_bytes"),
                "resume_text": download_record.get("resume_text", ""),
                "timestamp": self._now(),
            }
        )
        return self.save(payload)

    def save_workspace_draft(self, draft_record: Dict[str, Any]) -> Dict[str, Any]:
        """Persist the latest workspace draft for later recovery."""

        payload = self.load()
        payload["workspace_draft"] = {
            "form_state": draft_record.get("form_state") or {},
            "source": draft_record.get("source") or "manual",
            "saved_at": self._now(),
        }
        payload = self.save(payload)
        return payload["workspace_draft"]

    def save_resume_snapshot(self, snapshot_record: Dict[str, Any]) -> Dict[str, Any]:
        """Persist one manual resume snapshot."""

        payload = self.load()
        payload["resume_snapshots"].append(
            {
                "timestamp": self._now(),
                "title": snapshot_record.get("title", ""),
                "target_company": snapshot_record.get("target_company", ""),
                "target_role": snapshot_record.get("target_role", ""),
                "resume_text": snapshot_record.get("resume_text", ""),
                "generation_mode": snapshot_record.get("generation_mode", "manual_preserve"),
                "analysis_notes": snapshot_record.get("analysis_notes") or [],
            }
        )
        payload = self.save(payload)
        return payload["resume_snapshots"][-1]

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
