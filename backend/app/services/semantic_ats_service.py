"""Semantic ATS scoring service backed by embeddings with lexical fallback."""

from __future__ import annotations

import re
from collections import Counter
from typing import Dict, List

from .embedding_service import EmbeddingService


STOP_WORDS = {
    "and",
    "the",
    "for",
    "with",
    "from",
    "that",
    "this",
    "role",
    "position",
    "candidate",
    "experience",
    "years",
    "year",
    "ability",
    "required",
    "preferred",
    "responsible",
    "understanding",
    "knowledge",
    "熟悉",
    "掌握",
    "了解",
    "具备",
    "负责",
    "相关",
    "优先",
    "岗位",
    "职位",
    "要求",
    "经验",
    "能力",
}

TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9.+#/-]{1,}|[\u4e00-\u9fff]{2,8}")
SAFE_SHORT_ENGLISH_TERMS = {"bi", "go", "qa", "ui", "ux"}


class SemanticATSService:
    """Score resume-to-JD semantic fit while preserving ATS-style keyword feedback."""

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

    def _normalize_token(self, token: str) -> str:
        normalized = (token or "").strip().lower()
        alias_map = {
            "js": "javascript",
            "ts": "typescript",
            "nodejs": "node.js",
            "node": "node.js",
            "k8s": "kubernetes",
            "llm": "llm",
            "nlp": "nlp",
            "rag": "rag",
        }
        return alias_map.get(normalized, normalized)

    def _is_ambiguous_short_token(self, token: str) -> bool:
        if not token or re.search(r"[\u4e00-\u9fff]", token):
            return False
        return token.isalpha() and len(token) == 2 and token not in SAFE_SHORT_ENGLISH_TERMS

    def _extract_keywords(self, job_description: str, limit: int = 8) -> List[str]:
        tokens = [
            self._normalize_token(match.group(0))
            for match in TOKEN_PATTERN.finditer(job_description or "")
        ]
        filtered = [
            token
            for token in tokens
            if token
            and token not in STOP_WORDS
            and len(token) >= 2
            and not self._is_ambiguous_short_token(token)
        ]
        counts = Counter(filtered)
        ranked = sorted(counts.items(), key=lambda item: (-item[1], -len(item[0]), item[0]))
        return [token for token, _count in ranked[:limit]]

    def _lexical_coverage(self, resume_text: str, keywords: List[str]) -> tuple[float, List[str], List[str]]:
        haystack = (resume_text or "").lower()
        matched: List[str] = []
        missing: List[str] = []
        for keyword in keywords:
            if keyword and keyword in haystack:
                matched.append(keyword)
            else:
                missing.append(keyword)

        coverage = len(matched) / len(keywords) if keywords else 0.0
        return coverage, matched, missing

    def _calibrate_cosine(self, similarity: float) -> int:
        """Map embedding cosine similarity to a more ATS-like 0-100 score."""

        lower_bound = 0.35
        upper_bound = 0.85
        normalized = (similarity - lower_bound) / max(upper_bound - lower_bound, 1e-6)
        return int(round(max(0.0, min(1.0, normalized)) * 100))

    def _build_tip(self, matched: List[str], missing: List[str], overall_score: int) -> str:
        if missing:
            focus_terms = "、".join(missing[:3])
            return f"优先补强 {focus_terms}，并在技能或项目经历里写出真实使用场景。"
        if matched:
            focus_terms = "、".join(matched[:2])
            return f"当前已经命中 {focus_terms} 等关键词，下一步可继续补充量化结果和业务影响。"
        if overall_score >= 80:
            return "整体匹配度较高，建议继续补充量化成果与行业语境，让表述更有竞争力。"
        return "先补充与目标岗位最相关的技能、项目和量化结果，再重新评估匹配度。"

    def score(self, resume_text: str, job_description: str) -> Dict:
        """Return ATS-compatible scoring plus semantic metadata."""

        cleaned_resume = (resume_text or "").strip()
        cleaned_jd = (job_description or "").strip()
        if not cleaned_resume or not cleaned_jd:
            return {
                "overallScore": 0,
                "matchedKeywords": [],
                "missingKeywords": [],
                "improvementTip": "请先补充岗位描述和可评分的简历正文。",
                "mode": "insufficient_input",
                "semanticSimilarity": 0.0,
                "keywordCoverage": 0.0,
                "provider": "none",
                "model": "",
                "scoringVersion": "phase3-semantic-v1",
            }

        keywords = self._extract_keywords(cleaned_jd)
        coverage, matched, missing = self._lexical_coverage(cleaned_resume, keywords)
        lexical_score = int(round(coverage * 100))

        if self.embedding_service.is_available:
            try:
                resume_vector, job_vector = self.embedding_service.embed_texts(
                    [cleaned_resume, cleaned_jd],
                    scope="ATS 语义评分",
                )
                similarity = self.embedding_service.cosine_similarity(resume_vector, job_vector)
                semantic_score = self._calibrate_cosine(similarity)
                overall_score = int(round(semantic_score * 0.7 + lexical_score * 0.3))
                return {
                    "overallScore": max(0, min(100, overall_score)),
                    "matchedKeywords": matched[:8],
                    "missingKeywords": missing[:8],
                    "improvementTip": self._build_tip(matched, missing, overall_score),
                    "mode": "embedding",
                    "semanticSimilarity": round(similarity, 4),
                    "keywordCoverage": round(coverage, 4),
                    "provider": "openai",
                    "model": self.embedding_service.model_name,
                    "scoringVersion": "phase3-semantic-v1",
                }
            except Exception as exc:
                fallback_tip = self._build_tip(matched, missing, lexical_score)
                return {
                    "overallScore": lexical_score,
                    "matchedKeywords": matched[:8],
                    "missingKeywords": missing[:8],
                    "improvementTip": fallback_tip,
                    "mode": "lexical_fallback",
                    "semanticSimilarity": 0.0,
                    "keywordCoverage": round(coverage, 4),
                    "provider": "fallback",
                    "model": "",
                    "warning": str(exc) or self.embedding_service.build_fallback_warning("ATS 语义评分"),
                    "scoringVersion": "phase3-semantic-v1",
                }

        overall_score = int(round(lexical_score * 0.82 + min(len(matched), 3) * 6))
        return {
            "overallScore": max(0, min(100, overall_score)),
            "matchedKeywords": matched[:8],
            "missingKeywords": missing[:8],
            "improvementTip": self._build_tip(matched, missing, overall_score),
            "mode": "lexical_fallback",
            "semanticSimilarity": round(coverage, 4),
            "keywordCoverage": round(coverage, 4),
            "provider": "fallback",
            "model": "",
            "scoringVersion": "phase3-semantic-v1",
        }
