"""Shared OpenAI embedding utilities for semantic ATS scoring and RAG retrieval."""

from __future__ import annotations

import hashlib
import math
import time
from typing import Dict, List

from openai import OpenAI


class EmbeddingService:
    """Thin wrapper around the OpenAI embeddings API with in-process caching."""

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "",
        model_name: str = "text-embedding-3-small",
        enabled: bool = True,
        cooldown_seconds: int = 180,
    ):
        self.enabled = bool(enabled)
        self.api_key = (api_key or "").strip()
        self.base_url = (base_url or "").rstrip("/")
        self.model_name = (model_name or "text-embedding-3-small").strip() or "text-embedding-3-small"
        self.client = (
            OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or None,
            )
            if self.enabled and self.api_key
            else None
        )
        self.cooldown_seconds = max(0, int(cooldown_seconds or 0))
        self._cache: Dict[str, List[float]] = {}
        self._cooldown_until = 0.0
        self._last_error = ""

    @property
    def is_available(self) -> bool:
        """Whether semantic embeddings are configured and callable."""

        return self.client is not None

    def build_fallback_warning(self, scope: str = "语义评分") -> str:
        if not self.enabled:
            return ""
        return f"{scope} 当前无法使用语义向量服务，已自动切换为关键词匹配。"

    def _cache_key(self, text: str) -> str:
        payload = f"{self.model_name}\n{text}".encode("utf-8")
        return hashlib.sha1(payload).hexdigest()

    def _cooldown_active(self) -> bool:
        return self._cooldown_until > time.time()

    def _summarize_exception(self, exc: Exception) -> str:
        parts = [str(exc).strip()]

        status_code = getattr(exc, "status_code", None)
        if status_code and str(status_code) not in " ".join(parts):
            parts.append(f"status={status_code}")

        body = getattr(exc, "body", None)
        if body:
            parts.append(str(body).strip())

        response = getattr(exc, "response", None)
        if response is not None:
            response_text = getattr(response, "text", "")
            if response_text:
                parts.append(str(response_text).strip())

        summary = " | ".join(part for part in parts if part)
        return summary or exc.__class__.__name__

    def _should_cooldown(self, message: str, status_code: int | None = None) -> bool:
        normalized = (message or "").lower()
        return bool(
            status_code in {429, 500, 502, 503, 504}
            or "no_available_providers" in normalized
            or "service unavailable" in normalized
            or "temporarily unavailable" in normalized
            or "overloaded" in normalized
        )

    def _handle_provider_error(self, exc: Exception, scope: str = "语义评分") -> RuntimeError:
        summary = self._summarize_exception(exc)
        self._last_error = summary

        if self._should_cooldown(summary, getattr(exc, "status_code", None)):
            self._cooldown_until = time.time() + self.cooldown_seconds

        warning = self.build_fallback_warning(scope)
        return RuntimeError(warning or "语义向量服务当前不可用。")

    def embed_texts(self, texts: List[str], scope: str = "语义评分") -> List[List[float]]:
        """Embed multiple texts, reusing cache entries when possible."""

        if not self.client:
            raise RuntimeError("Embedding client is not configured.")
        if self._cooldown_active():
            raise RuntimeError(self.build_fallback_warning(scope))

        cleaned = [(text or "").strip() for text in texts]
        if not cleaned:
            return []

        vectors: List[List[float] | None] = [None] * len(cleaned)
        pending_inputs: List[str] = []
        pending_meta: List[tuple[int, str]] = []

        for index, text in enumerate(cleaned):
            cache_key = self._cache_key(text)
            cached = self._cache.get(cache_key)
            if cached is not None:
                vectors[index] = cached
                continue
            pending_inputs.append(text)
            pending_meta.append((index, cache_key))

        if pending_inputs:
            try:
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=pending_inputs,
                )
            except Exception as exc:
                raise self._handle_provider_error(exc, scope) from exc
            for (index, cache_key), item in zip(pending_meta, response.data):
                vector = list(item.embedding)
                self._cache[cache_key] = vector
                vectors[index] = vector

        return [vector or [] for vector in vectors]

    def embed_text(self, text: str, scope: str = "语义评分") -> List[float]:
        """Embed one text string."""

        vectors = self.embed_texts([text], scope=scope)
        return vectors[0] if vectors else []

    @staticmethod
    def cosine_similarity(left: List[float], right: List[float]) -> float:
        """Compute cosine similarity without NumPy."""

        if not left or not right or len(left) != len(right):
            return 0.0

        numerator = sum(a * b for a, b in zip(left, right))
        left_norm = math.sqrt(sum(value * value for value in left))
        right_norm = math.sqrt(sum(value * value for value in right))
        if not left_norm or not right_norm:
            return 0.0
        return numerator / (left_norm * right_norm)
