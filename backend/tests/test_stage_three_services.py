"""Regression tests for stage-three semantic ATS and RAG services."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from backend.app.services.embedding_service import EmbeddingService
from backend.app.services.rag_service import RagService
from backend.app.services.semantic_ats_service import SemanticATSService


class SemanticATSServiceTests(unittest.TestCase):
    def test_lexical_fallback_scores_keywords_without_embeddings(self):
        service = SemanticATSService(embedding_service=EmbeddingService())

        result = service.score(
            resume_text="熟悉 Python、FastAPI、SQL，负责接口开发与性能优化。",
            job_description="后端工程师，需要熟悉 Python、API 设计、数据库优化。",
        )

        self.assertEqual(result["mode"], "lexical_fallback")
        self.assertGreater(result["overallScore"], 0)
        self.assertIn("python", result["matchedKeywords"])
        self.assertIn("keywordCoverage", result)
        self.assertEqual(result["scoringVersion"], "phase3-semantic-v1")

    def test_ignores_ambiguous_two_letter_keywords_in_feedback(self):
        service = SemanticATSService(embedding_service=EmbeddingService())

        result = service.score(
            resume_text="熟悉 FastAPI，负责接口开发与联调。",
            job_description="后端工程师，需要熟悉 nm、Go、FastAPI。",
        )

        missing_keywords = [keyword.lower() for keyword in result["missingKeywords"]]

        self.assertNotIn("nm", missing_keywords)
        self.assertIn("go", missing_keywords)
        self.assertNotIn("nm", result["improvementTip"].lower())

    def test_embedding_failure_returns_friendly_fallback_warning(self):
        class FailingEmbeddingService:
            is_available = True
            model_name = "text-embedding-3-small"

            def embed_texts(self, _texts, scope="语义评分"):
                raise RuntimeError(f"{scope} 当前无法使用语义向量服务，已自动切换为关键词匹配。")

            @staticmethod
            def cosine_similarity(_left, _right):
                return 0.0

            @staticmethod
            def build_fallback_warning(scope="语义评分"):
                return f"{scope} 当前无法使用语义向量服务，已自动切换为关键词匹配。"

        service = SemanticATSService(embedding_service=FailingEmbeddingService())

        result = service.score(
            resume_text="熟悉 Python、FastAPI 和 SQL，负责接口开发与性能优化。",
            job_description="后端工程师，需要熟悉 Python、API 设计和数据库优化。",
        )

        self.assertEqual(result["mode"], "lexical_fallback")
        self.assertIn("关键词匹配", result.get("warning", ""))
        self.assertNotIn("no_available_providers", result.get("warning", ""))


class RagServiceTests(unittest.TestCase):
    def test_search_returns_lexical_results_with_source_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            reference_dir = Path(temp_dir)
            reference_dir.joinpath("references.json").write_text(
                json.dumps(
                    [
                        {
                            "id": "ref-data-1",
                            "title": "数据工程师参考",
                            "role": "数据工程师",
                            "industry": "数据平台",
                            "summary": "强调 Spark、Airflow、数据建模与离线链路。",
                            "skills": ["Spark", "Airflow", "SQL"],
                            "bullets": ["负责离线链路调度与数据建模。"],
                            "source_title": "中文大数据工程师模板",
                            "source_url": "https://example.com/chinese-data-resume",
                            "source_note": "匿名化提炼",
                        }
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            service = RagService(
                embedding_service=EmbeddingService(),
                reference_dir=reference_dir,
                top_k=3,
            )

            result = service.search("高级数据工程师 Spark Airflow", top_k=2)

            self.assertEqual(result["mode"], "lexical_fallback")
            self.assertEqual(result["count"], 1)
            self.assertEqual(result["results"][0]["title"], "数据工程师参考")
            self.assertEqual(result["results"][0]["source_title"], "中文大数据工程师模板")
            self.assertEqual(
                result["results"][0]["source_url"],
                "https://example.com/chinese-data-resume",
            )


if __name__ == "__main__":
    unittest.main()
