"""Persistent user-profile memory capped to a small JSON file."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Iterable


class ProfileMemoryService:
    """Keep a compact long-term user profile memory under a hard byte limit."""

    def __init__(self, profile_memory_file: Path, max_bytes: int = 4096):
        self.profile_memory_file = profile_memory_file
        self.max_bytes = max_bytes
        self._lock = Lock()
        self.profile_memory_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file()

    @staticmethod
    def _now() -> str:
        return datetime.now().astimezone().isoformat()

    def _default_payload(self) -> Dict[str, Any]:
        return {
            "note": "Persistent user profile memory loaded on every fresh website session.",
            "username": "ft",
            "updated_at": self._now(),
            "max_size_bytes": self.max_bytes,
            "profile": {
                "target_roles": [],
                "target_companies": [],
                "cities": [],
                "skills": [],
                "education_keywords": [],
                "project_keywords": [],
                "experience_keywords": [],
                "writing_preferences": ["中文简历", "优先量化结果"],
                "fact_guards": ["不得编造事实", "不得夸大经历", "优先使用用户提供信息"],
            },
        }

    def _ensure_file(self) -> None:
        if not self.profile_memory_file.exists():
            self.profile_memory_file.write_text(
                json.dumps(self._default_payload(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def _json_size(self, payload: Dict[str, Any]) -> int:
        return len(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))

    def _compact_text(self, value: str, limit: int) -> str:
        compact = re.sub(r"\s+", " ", value or "").strip()
        return compact[:limit]

    def _merge_unique(
        self,
        existing: Iterable[str],
        incoming: Iterable[str],
        *,
        max_items: int,
        item_limit: int,
    ) -> list[str]:
        merged: list[str] = []
        for raw in [*(existing or []), *(incoming or [])]:
            normalized = self._compact_text(raw, item_limit)
            if normalized and normalized not in merged:
                merged.append(normalized)
            if len(merged) >= max_items:
                break
        return merged

    def _normalize_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        base = self._default_payload()
        profile = payload.get("profile") or {}
        base["username"] = self._compact_text(payload.get("username") or "ft", 32) or "ft"
        base["updated_at"] = payload.get("updated_at") or self._now()
        base["profile"] = {
            "target_roles": self._merge_unique(profile.get("target_roles", []), [], max_items=6, item_limit=28),
            "target_companies": self._merge_unique(
                profile.get("target_companies", []), [], max_items=6, item_limit=28
            ),
            "cities": self._merge_unique(profile.get("cities", []), [], max_items=4, item_limit=16),
            "skills": self._merge_unique(profile.get("skills", []), [], max_items=12, item_limit=24),
            "education_keywords": self._merge_unique(
                profile.get("education_keywords", []), [], max_items=6, item_limit=36
            ),
            "project_keywords": self._merge_unique(
                profile.get("project_keywords", []), [], max_items=8, item_limit=40
            ),
            "experience_keywords": self._merge_unique(
                profile.get("experience_keywords", []), [], max_items=8, item_limit=40
            ),
            "writing_preferences": self._merge_unique(
                profile.get("writing_preferences", []), [], max_items=6, item_limit=18
            ),
            "fact_guards": self._merge_unique(profile.get("fact_guards", []), [], max_items=4, item_limit=18),
        }
        return base

    def _fit_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        fitted = self._normalize_payload(payload)
        trim_order = [
            "project_keywords",
            "experience_keywords",
            "education_keywords",
            "skills",
            "target_companies",
            "target_roles",
            "cities",
            "writing_preferences",
            "fact_guards",
        ]
        profile = fitted["profile"]

        while self._json_size(fitted) > self.max_bytes:
            removed = False
            for key in trim_order:
                if profile.get(key):
                    profile[key].pop()
                    removed = True
                    break
            if not removed:
                fitted["note"] = self._compact_text(fitted.get("note", ""), 48)
                fitted["username"] = self._compact_text(fitted.get("username", "ft"), 12) or "ft"
                break

        if self._json_size(fitted) > self.max_bytes:
            minimal = self._default_payload()
            minimal["username"] = fitted.get("username", "ft") or "ft"
            minimal["updated_at"] = self._now()
            minimal["profile"]["writing_preferences"] = []
            minimal["profile"]["fact_guards"] = ["不得编造事实"]
            return minimal
        return fitted

    def load(self) -> Dict[str, Any]:
        with self._lock:
            try:
                payload = json.loads(self.profile_memory_file.read_text(encoding="utf-8"))
            except Exception:
                payload = self._default_payload()
                self.profile_memory_file.write_text(
                    json.dumps(payload, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            return self._fit_payload(payload)

    def save(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        fitted = self._fit_payload(payload)
        with self._lock:
            self.profile_memory_file.write_text(
                json.dumps(fitted, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        return fitted

    def sync_from_profile(self, profile_payload: Dict[str, Any], workflow: str) -> Dict[str, Any]:
        payload = self.load()
        profile = payload["profile"]
        basic_info = profile_payload.get("basic_info") or {}
        education = profile_payload.get("education") or []
        projects = profile_payload.get("projects") or []
        experiences = profile_payload.get("experiences") or []

        education_keywords = [
            " ".join(part for part in [item.get("school", ""), item.get("major", "")] if part).strip()
            for item in education
        ]
        project_keywords = [
            " / ".join(part for part in [item.get("name", ""), item.get("role", "")] if part).strip()
            for item in projects
        ]
        experience_keywords = [
            " / ".join(part for part in [item.get("company", ""), item.get("role", "")] if part).strip()
            for item in experiences
        ]
        writing_preferences = [
            "保留更多细节" if profile_payload.get("use_full_information") else "表达精炼",
            "优先优化已有简历" if workflow == "existing_resume" else "优先从零生成",
            "优先量化结果",
        ]

        profile["target_roles"] = self._merge_unique(
            profile.get("target_roles", []),
            [basic_info.get("target_role", "")],
            max_items=6,
            item_limit=28,
        )
        profile["target_companies"] = self._merge_unique(
            profile.get("target_companies", []),
            [basic_info.get("target_company", "")],
            max_items=6,
            item_limit=28,
        )
        profile["cities"] = self._merge_unique(
            profile.get("cities", []),
            [basic_info.get("city", "")],
            max_items=4,
            item_limit=16,
        )
        profile["skills"] = self._merge_unique(
            profile.get("skills", []),
            profile_payload.get("skills", []) or [],
            max_items=12,
            item_limit=24,
        )
        profile["education_keywords"] = self._merge_unique(
            profile.get("education_keywords", []),
            education_keywords,
            max_items=6,
            item_limit=36,
        )
        profile["project_keywords"] = self._merge_unique(
            profile.get("project_keywords", []),
            project_keywords,
            max_items=8,
            item_limit=40,
        )
        profile["experience_keywords"] = self._merge_unique(
            profile.get("experience_keywords", []),
            experience_keywords,
            max_items=8,
            item_limit=40,
        )
        profile["writing_preferences"] = self._merge_unique(
            profile.get("writing_preferences", []),
            writing_preferences,
            max_items=6,
            item_limit=18,
        )
        profile["fact_guards"] = self._merge_unique(
            profile.get("fact_guards", []),
            ["不得编造事实", "不得夸大经历", "优先使用用户提供信息"],
            max_items=4,
            item_limit=18,
        )
        payload["updated_at"] = self._now()
        payload["last_synced_from"] = workflow
        return self.save(payload)
