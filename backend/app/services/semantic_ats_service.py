"""Deterministic enterprise-style ATS scoring service.

The score intentionally avoids using AI or embedding similarity as the primary
signal. Large ATS products are mostly deterministic filters: keyword coverage,
required-skill evidence, parseability, section completeness, and risk flags.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Literal

from .embedding_service import EmbeddingService


KeywordCategory = Literal["hard", "soft", "experience", "general"]

TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9.+#/-]{1,}|[\u4e00-\u9fff]{2,10}")
EN_BOUNDARY_TEMPLATE = r"(^|[^a-z0-9+#.]){term}(?=$|[^a-z0-9+#.])"

STOP_WORDS = {
    "and",
    "or",
    "the",
    "a",
    "an",
    "to",
    "of",
    "for",
    "with",
    "in",
    "on",
    "at",
    "by",
    "from",
    "using",
    "use",
    "plus",
    "ability",
    "experience",
    "years",
    "year",
    "work",
    "working",
    "related",
    "preferred",
    "required",
    "requirements",
    "candidate",
    "role",
    "position",
    "job",
    "team",
    "must",
    "should",
    "熟悉",
    "掌握",
    "了解",
    "具备",
    "负责",
    "参与",
    "能够",
    "需要",
    "优先",
    "相关",
    "岗位",
    "职位",
    "要求",
    "能力",
    "经验",
    "以上",
    "以及",
    "我们",
    "你将",
    "良好",
    "优秀",
}

ALIAS_MAP = {
    "js": "javascript",
    "ts": "typescript",
    "nodejs": "node.js",
    "node": "node.js",
    "reactjs": "react",
    "vuejs": "vue",
    "nextjs": "next.js",
    "restful": "rest api",
    "rest": "rest api",
    "golang": "go",
    "k8s": "kubernetes",
    "powerbi": "power bi",
    "sklearn": "scikit-learn",
    "scikitlearn": "scikit-learn",
}

SAFE_SHORT_ENGLISH_TERMS = {"bi", "go", "qa", "ui", "ux"}

HARD_SKILL_TERMS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "mysql",
    "postgresql",
    "redis",
    "excel",
    "power bi",
    "tableau",
    "pandas",
    "numpy",
    "matplotlib",
    "scikit-learn",
    "spark",
    "hive",
    "flink",
    "airflow",
    "etl",
    "linux",
    "git",
    "docker",
    "kubernetes",
    "spring",
    "spring boot",
    "react",
    "vue",
    "node.js",
    "fastapi",
    "机器学习",
    "深度学习",
    "自然语言处理",
    "数据分析",
    "数据处理",
    "数据清洗",
    "数据可视化",
    "统计分析",
    "统计建模",
    "特征工程",
    "用户行为分析",
    "报表",
    "仪表盘",
    "数据仓库",
    "数据库",
    "算法",
    "多线程",
    "并发",
}

SOFT_SKILL_TERMS = {
    "communication",
    "collaboration",
    "teamwork",
    "leadership",
    "ownership",
    "problem solving",
    "stakeholder management",
    "mentoring",
    "沟通",
    "协作",
    "团队合作",
    "推动",
    "复盘",
    "汇报",
    "需求分析",
    "方案讨论",
    "问题解决",
}

EXPERIENCE_TERMS = {
    "backend",
    "frontend",
    "data analyst",
    "data engineer",
    "software engineer",
    "开发",
    "分析",
    "优化",
    "设计",
    "实现",
    "构建",
    "交付",
    "维护",
    "上线",
    "迭代",
    "项目",
    "实习",
    "数据分析师",
    "软件开发",
}

ACTION_TERMS = {
    "负责",
    "参与",
    "设计",
    "实现",
    "优化",
    "构建",
    "完成",
    "推动",
    "落地",
    "维护",
    "分析",
    "developed",
    "built",
    "designed",
    "optimized",
    "delivered",
    "implemented",
}


@dataclass
class WeightedKeyword:
    label: str
    normalized: str
    category: KeywordCategory
    weight: float


class SemanticATSService:
    """Score resume-to-JD fit using stable enterprise ATS-style rules."""

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

    @staticmethod
    def _has_cjk(value: str) -> bool:
        return bool(re.search(r"[\u4e00-\u9fff]", value or ""))

    def _normalize_token(self, token: str) -> str:
        normalized = (token or "").strip().lower()
        normalized = re.sub(r"[()（）\[\]{}，。；：、|｜]", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        compact = normalized.replace(" ", "")
        return ALIAS_MAP.get(compact) or ALIAS_MAP.get(normalized) or normalized

    def _display_label(self, token: str) -> str:
        if self._has_cjk(token):
            return token
        special = {
            "javascript": "JavaScript",
            "typescript": "TypeScript",
            "node.js": "Node.js",
            "rest api": "REST API",
            "power bi": "Power BI",
            "sql": "SQL",
            "etl": "ETL",
        }
        if token in special:
            return special[token]
        return " ".join(part.upper() if len(part) <= 3 else part.capitalize() for part in token.split())

    def _is_noise_keyword(self, token: str) -> bool:
        if not token or token in STOP_WORDS:
            return True
        if not self._has_cjk(token) and token.isalpha() and len(token) == 2 and token not in SAFE_SHORT_ENGLISH_TERMS:
            return True
        if self._has_cjk(token) and len(token) < 2:
            return True
        return False

    def _category_for(self, token: str) -> KeywordCategory:
        if token in HARD_SKILL_TERMS:
            return "hard"
        if token in SOFT_SKILL_TERMS:
            return "soft"
        if token in EXPERIENCE_TERMS:
            return "experience"
        if re.search(r"[.+#]|\d", token):
            return "hard"
        return "general"

    def _add_keyword(
        self,
        keywords: Dict[str, WeightedKeyword],
        token: str,
        category: KeywordCategory | None = None,
        weight: float = 1.0,
    ) -> None:
        normalized = self._normalize_token(token)
        if self._is_noise_keyword(normalized):
            return
        resolved_category = category or self._category_for(normalized)
        existing = keywords.get(normalized)
        if existing:
            existing.weight += weight
            if existing.category == "general" and resolved_category != "general":
                existing.category = resolved_category
                existing.label = self._display_label(normalized)
            return
        keywords[normalized] = WeightedKeyword(
            label=self._display_label(normalized),
            normalized=normalized,
            category=resolved_category,
            weight=weight,
        )

    def _extract_keywords(self, job_description: str, limit: int = 18) -> List[WeightedKeyword]:
        text = job_description or ""
        normalized_text = self._normalize_token(text)
        keywords: Dict[str, WeightedKeyword] = {}

        for term in sorted(HARD_SKILL_TERMS | SOFT_SKILL_TERMS | EXPERIENCE_TERMS, key=len, reverse=True):
            normalized = self._normalize_token(term)
            if self._contains(normalized_text, normalized):
                base = 2.8 if normalized in HARD_SKILL_TERMS else 1.6 if normalized in EXPERIENCE_TERMS else 1.0
                self._add_keyword(keywords, normalized, self._category_for(normalized), base)

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        for index, line in enumerate(lines):
            line_boost = 0.6 if index <= 2 else 0.0
            list_boost = 0.35 if re.match(r"^[-*•\d]", line) else 0.0
            for match in TOKEN_PATTERN.finditer(line):
                token = self._normalize_token(match.group(0))
                if self._is_noise_keyword(token):
                    continue
                category = self._category_for(token)
                if self._has_cjk(token) and category == "general":
                    continue
                category_boost = 0.9 if category == "hard" else 0.45 if category == "experience" else 0.2
                length_boost = min(0.5, len(token) * (0.055 if self._has_cjk(token) else 0.03))
                self._add_keyword(keywords, token, category, 1.0 + line_boost + list_boost + category_boost + length_boost)

        ranked = sorted(keywords.values(), key=lambda item: (-item.weight, item.category != "hard", item.label))
        return ranked[:limit]

    def _contains(self, text: str, keyword: str) -> bool:
        if not text or not keyword:
            return False
        if self._has_cjk(keyword):
            return keyword in text
        escaped = re.escape(keyword)
        return bool(re.search(EN_BOUNDARY_TEMPLATE.format(term=escaped), text))

    def _weighted_coverage(
        self,
        resume_text: str,
        keywords: Iterable[WeightedKeyword],
    ) -> tuple[float, List[WeightedKeyword], List[WeightedKeyword]]:
        items = list(keywords)
        if not items:
            return 1.0, [], []
        total = sum(item.weight for item in items) or 1.0
        matched: List[WeightedKeyword] = []
        missing: List[WeightedKeyword] = []
        for item in items:
            if self._contains(resume_text, item.normalized):
                matched.append(item)
            else:
                missing.append(item)
        covered = sum(item.weight for item in matched)
        return covered / total, matched, missing

    def _resume_signals(self, resume_text: str) -> Dict[str, int | bool]:
        raw = resume_text or ""
        normalized = self._normalize_token(raw)
        bullet_count = len(re.findall(r"^\s*[-*•]\s+", raw, flags=re.MULTILINE))
        quantified_count = len(re.findall(r"\d+(?:\.\d+)?\s*(?:%|万|k|K|次|人|条|小时|天|月|年|元)?", raw))
        action_hits = sum(1 for term in ACTION_TERMS if self._contains(normalized, self._normalize_token(term)))
        hard_hits = sum(1 for term in HARD_SKILL_TERMS if self._contains(normalized, self._normalize_token(term)))
        has_contact = bool(re.search(r"[\w.+-]+@[\w.-]+\.\w+", raw) or re.search(r"1[3-9]\d{9}", raw))
        return {
            "has_contact": has_contact,
            "has_summary": bool(re.search(r"个人总结|个人评价|自我评价|summary", raw, flags=re.IGNORECASE)),
            "has_skills": bool(re.search(r"技能|技术栈|skills", raw, flags=re.IGNORECASE)) or hard_hits >= 3,
            "has_education": bool(re.search(r"教育|本科|硕士|大学|学院|education", raw, flags=re.IGNORECASE)),
            "has_experience": bool(re.search(r"实习|工作|经历|公司|experience", raw, flags=re.IGNORECASE)),
            "has_project": bool(re.search(r"项目|project", raw, flags=re.IGNORECASE)),
            "bullet_count": bullet_count,
            "quantified_count": quantified_count,
            "action_hits": action_hits,
            "hard_hits": hard_hits,
        }

    @staticmethod
    def _clamp_score(value: float) -> int:
        return max(0, min(100, int(round(value))))

    def _evidence_score(self, signals: Dict[str, int | bool]) -> int:
        score = 0
        score += 26 if signals["has_experience"] else 0
        score += 18 if signals["has_project"] else 0
        score += min(18, int(signals["bullet_count"]) * 3)
        score += min(22, int(signals["quantified_count"]) * 3)
        score += min(16, int(signals["action_hits"]) * 2)
        return self._clamp_score(score)

    def _content_score(self, signals: Dict[str, int | bool], resume_text: str) -> int:
        length = len((resume_text or "").strip())
        score = 0
        score += 15 if signals["has_contact"] else 0
        score += 14 if signals["has_summary"] else 0
        score += 18 if signals["has_skills"] else 0
        score += 14 if signals["has_education"] else 0
        score += 16 if signals["has_experience"] else 0
        score += 12 if signals["has_project"] else 0
        score += 11 if 650 <= length <= 2200 else 6 if length >= 350 else 0
        return self._clamp_score(score)

    def _risk_flags(self, signals: Dict[str, int | bool], hard_score: int, content_score: int) -> List[str]:
        flags: List[str] = []
        if hard_score < 45:
            flags.append("核心硬技能覆盖不足")
        if not signals["has_contact"]:
            flags.append("联系方式缺失或不可解析")
        if not signals["has_skills"]:
            flags.append("技能区不清晰")
        if not signals["has_experience"] and not signals["has_project"]:
            flags.append("缺少经历或项目证据")
        if int(signals["quantified_count"]) == 0:
            flags.append("缺少量化成果")
        if content_score < 55:
            flags.append("简历结构完整度偏低")
        return flags[:5]

    def _build_tip(self, weakest_key: str, missing: List[WeightedKeyword], risks: List[str]) -> str:
        focus_terms = "、".join(item.label for item in missing[:3])
        if weakest_key == "hard":
            return f"优先补齐 {focus_terms or 'JD 中的核心硬技能'}，并把它们写进技能区和项目/经历要点里的真实使用场景。"
        if weakest_key == "experience":
            return "把岗位相关经历写成“动作 + 技术/方法 + 结果”的要点，尽量补充真实数字、规模或交付结果。"
        if weakest_key == "content":
            return "先补齐联系方式、教育、技能、经历/项目和个人总结，让 ATS 能稳定解析完整简历结构。"
        if risks:
            return f"当前最大风险是“{risks[0]}”，建议先处理这一项再重新评分。"
        return "整体匹配度较高，下一步可继续压缩表达并强化与 JD 原词一致的核心技能。"

    def score(self, resume_text: str, job_description: str) -> Dict:
        cleaned_resume = (resume_text or "").strip()
        cleaned_jd = (job_description or "").strip()
        if not cleaned_resume or not cleaned_jd:
            return {
                "overallScore": 0,
                "matchedKeywords": [],
                "missingKeywords": [],
                "improvementTip": "请先补充岗位 JD 和可评分的简历正文。",
                "mode": "insufficient_input",
                "semanticSimilarity": 0.0,
                "keywordCoverage": 0.0,
                "provider": "enterprise_rules",
                "model": "",
                "scoreBreakdown": [],
                "riskFlags": ["输入不足"],
                "scoringVersion": "enterprise-ats-v2",
            }

        normalized_resume = self._normalize_token(cleaned_resume)
        keywords = self._extract_keywords(cleaned_jd)
        hard_keywords = [item for item in keywords if item.category == "hard"]
        soft_keywords = [item for item in keywords if item.category == "soft"]
        experience_keywords = [item for item in keywords if item.category == "experience"]

        all_coverage, matched, missing = self._weighted_coverage(normalized_resume, keywords)
        hard_coverage, _hard_matched, _hard_missing = self._weighted_coverage(normalized_resume, hard_keywords)
        soft_coverage, _soft_matched, _soft_missing = self._weighted_coverage(normalized_resume, soft_keywords)
        exp_coverage, _exp_matched, _exp_missing = self._weighted_coverage(normalized_resume, experience_keywords)

        signals = self._resume_signals(cleaned_resume)
        hard_score = self._clamp_score(hard_coverage * 100)
        role_score = self._clamp_score((exp_coverage * 0.72 + soft_coverage * 0.28) * 100)
        evidence_score = self._evidence_score(signals)
        content_score = self._content_score(signals, cleaned_resume)

        overall = self._clamp_score(
            hard_score * 0.48
            + role_score * 0.18
            + evidence_score * 0.18
            + content_score * 0.16
        )

        if hard_keywords and hard_score < 35:
            overall = min(overall, 68)
        if not signals["has_experience"] and not signals["has_project"]:
            overall = min(overall, 64)
        if content_score < 45:
            overall = min(overall, 72)

        breakdown = [
            {"key": "hard", "label": "JD 硬技能覆盖", "score": hard_score, "weight": 0.48},
            {"key": "role", "label": "岗位语境匹配", "score": role_score, "weight": 0.18},
            {"key": "experience", "label": "经历证据强度", "score": evidence_score, "weight": 0.18},
            {"key": "content", "label": "ATS 可解析完整度", "score": content_score, "weight": 0.16},
        ]
        weakest = min(breakdown, key=lambda item: item["score"])
        risks = self._risk_flags(signals, hard_score, content_score)

        return {
            "overallScore": overall,
            "matchedKeywords": [item.label for item in matched[:10]],
            "missingKeywords": [item.label for item in missing[:10]],
            "improvementTip": self._build_tip(str(weakest["key"]), missing, risks),
            "mode": "enterprise_rules",
            "semanticSimilarity": round(all_coverage, 4),
            "keywordCoverage": round(all_coverage, 4),
            "provider": "enterprise_rules",
            "model": "",
            "scoreBreakdown": breakdown,
            "riskFlags": risks,
            "scoringVersion": "enterprise-ats-v2",
        }
