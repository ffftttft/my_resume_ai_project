"""Network job-intelligence search service backed by Tavily."""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from threading import Lock
from typing import Dict, List
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


TAVILY_ENDPOINT = "https://api.tavily.com/search"
DEFAULT_EXCLUDE_DOMAINS = [
    "douyin.com",
    "bilibili.com",
    "xiaohongshu.com",
    "zhihu.com",
    "tieba.baidu.com",
    "weibo.com",
]


@dataclass
class CachedSearchResult:
    """Cached network search response with timestamp."""

    created_at: float
    payload: Dict


class JobSearchService:
    """Search job-related web context and return prompt-safe normalized results."""

    def __init__(
        self,
        api_key: str = "",
        *,
        enabled: bool = True,
        ttl_seconds: int = 1800,
        max_results: int = 3,
    ):
        self.api_key = (api_key or "").strip()
        self.enabled = bool(enabled)
        self.ttl_seconds = max(60, int(ttl_seconds or 1800))
        self.max_results = max(1, min(int(max_results or 3), 8))
        self._cache: Dict[str, CachedSearchResult] = {}
        self._lock = Lock()

    @property
    def is_available(self) -> bool:
        """Whether network search is configured."""

        return self.enabled and bool(self.api_key)

    def build_query(self, target_company: str, target_role: str, job_requirements: str) -> str:
        """Build a compact search query based only on company and target role."""

        del job_requirements
        parts = [
            (target_company or "").strip(),
            (target_role or "").strip(),
        ]
        seed = " ".join(part for part in parts if part)
        return seed or "中文岗位 招聘"

    def _cache_key(self, query: str) -> str:
        return hashlib.sha1(query.encode("utf-8")).hexdigest()

    def _normalize_domain(self, url: str) -> str:
        try:
            return (urlparse(url).hostname or "").lower()
        except Exception:
            return ""

    def _domain_bonus(self, domain: str) -> float:
        if not domain:
            return 0.0
        if domain.endswith(".gov.cn") or domain.endswith(".edu.cn"):
            return 0.25
        if any(
            domain.endswith(suffix)
            for suffix in [
                ".com",
                ".cn",
                ".com.cn",
            ]
        ) and not any(token in domain for token in ["bbs", "forum", "tieba", "zhihu"]):
            return 0.12
        if any(token in domain for token in ["zhipin", "liepin", "51job", "lagou", "job"]):
            return 0.1
        return 0.0

    def _normalize_result(self, item: Dict) -> Dict:
        url = (item.get("url") or "").strip()
        domain = self._normalize_domain(url)
        title = (item.get("title") or "").strip()
        snippet = (item.get("content") or item.get("snippet") or "").strip()
        published_at = (item.get("published_date") or item.get("published_at") or "").strip()
        base_score = float(item.get("score") or 0.0)
        boosted_score = round(min(1.0, base_score + self._domain_bonus(domain)), 4)
        return {
            "title": title,
            "url": url,
            "source": domain,
            "snippet": snippet[:360],
            "published_at": published_at,
            "score": boosted_score,
        }

    def _request_tavily(self, query: str) -> Dict:
        payload = {
            "api_key": self.api_key,
            "query": query,
            "topic": "general",
            "search_depth": "advanced",
            "max_results": self.max_results,
            "include_answer": False,
            "include_raw_content": False,
            "exclude_domains": DEFAULT_EXCLUDE_DOMAINS,
        }
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            TAVILY_ENDPOINT,
            data=body,
            headers={
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=12) as response:  # nosec B310 - trusted endpoint configured in code
            raw = response.read().decode("utf-8")
        return json.loads(raw or "{}")

    def search(
        self,
        *,
        target_company: str,
        target_role: str,
        job_requirements: str,
        force_refresh: bool = False,
    ) -> Dict:
        """Search network job context with in-memory TTL caching."""

        query = self.build_query(target_company, target_role, job_requirements)
        if not self.enabled:
            return {
                "query": query,
                "provider": "tavily",
                "mode": "disabled",
                "cached": False,
                "results": [],
                "warning": "联网岗位情报已关闭，当前仅使用用户填写的 JD。",
            }

        if not self.api_key:
            return {
                "query": query,
                "provider": "tavily",
                "mode": "disabled",
                "cached": False,
                "results": [],
                "warning": "未配置 Tavily API Key，当前仅使用用户填写的 JD。",
            }

        cache_key = self._cache_key(query)
        with self._lock:
            cached = self._cache.get(cache_key)
            if (
                cached
                and not force_refresh
                and (time.time() - cached.created_at) < self.ttl_seconds
            ):
                cached_payload = dict(cached.payload)
                cached_payload["cached"] = True
                cached_payload["mode"] = "cached"
                return cached_payload

        try:
            payload = self._request_tavily(query)
            results = [
                self._normalize_result(item)
                for item in payload.get("results", [])
                if isinstance(item, dict) and (item.get("url") or item.get("title"))
            ]
            results.sort(key=lambda item: item.get("score", 0), reverse=True)
            normalized = {
                "query": query,
                "provider": "tavily",
                "mode": "network",
                "cached": False,
                "results": results[: self.max_results],
                "warning": "",
            }
            with self._lock:
                self._cache[cache_key] = CachedSearchResult(
                    created_at=time.time(),
                    payload=normalized,
                )
            if not normalized["results"]:
                normalized["mode"] = "empty"
                normalized["warning"] = "未检索到高质量岗位情报，当前仅使用用户填写的 JD。"
            return normalized
        except HTTPError as exc:
            return {
                "query": query,
                "provider": "tavily",
                "mode": "error",
                "cached": False,
                "results": [],
                "warning": f"联网岗位情报请求失败（HTTP {exc.code}），当前仅使用用户填写的 JD。",
            }
        except URLError as exc:
            return {
                "query": query,
                "provider": "tavily",
                "mode": "error",
                "cached": False,
                "results": [],
                "warning": f"联网岗位情报连接失败（{exc.reason}），当前仅使用用户填写的 JD。",
            }
        except Exception as exc:
            return {
                "query": query,
                "provider": "tavily",
                "mode": "error",
                "cached": False,
                "results": [],
                "warning": f"联网岗位情报检索失败：{exc}",
            }

    def build_prompt_context(
        self,
        *,
        target_company: str,
        target_role: str,
        job_requirements: str,
        force_refresh: bool = False,
    ) -> tuple[List[Dict], str]:
        """Build compact prompt-safe web context plus warning."""

        search_result = self.search(
            target_company=target_company,
            target_role=target_role,
            job_requirements=job_requirements,
            force_refresh=force_refresh,
        )
        context = [
            {
                "title": item.get("title", ""),
                "source": item.get("source", ""),
                "url": item.get("url", ""),
                "snippet": item.get("snippet", ""),
                "published_at": item.get("published_at", ""),
                "score": item.get("score", 0),
            }
            for item in search_result.get("results", [])
        ]
        return context, search_result.get("warning", "")
