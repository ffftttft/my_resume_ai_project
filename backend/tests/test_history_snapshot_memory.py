"""Regression tests for snapshot history payloads used by the history drawer."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from backend.app.services.memory_service import MemoryService


class SnapshotHistoryMemoryTests(unittest.TestCase):
    def test_register_generation_persists_title_and_analysis_notes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            service = MemoryService(Path(temp_dir) / "memory.json")

            service.register_generation(
                {
                    "event": "resume_generated",
                    "title": "中文后端简历草稿",
                    "target_company": "字节跳动",
                    "target_role": "后端工程师",
                    "resume_text": "示例简历正文",
                    "generation_mode": "openai",
                    "analysis_notes": ["优先补强量化结果。", "补充接口性能优化案例。"],
                }
            )

            payload = service.load()
            snapshot = payload["resume_snapshots"][-1]

            self.assertEqual(snapshot["title"], "中文后端简历草稿")
            self.assertEqual(snapshot["analysis_notes"][0], "优先补强量化结果。")
            self.assertEqual(snapshot["generation_mode"], "openai")

    def test_manual_snapshot_save_persists_analysis_notes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            service = MemoryService(Path(temp_dir) / "memory.json")

            snapshot = service.save_resume_snapshot(
                {
                    "title": "手动保存版本",
                    "target_company": "阿里云",
                    "target_role": "数据分析师",
                    "resume_text": "手动编辑后的正文",
                    "generation_mode": "manual_preserve",
                    "analysis_notes": ["当前版本更适合偏分析岗位。"],
                }
            )

            self.assertEqual(snapshot["title"], "手动保存版本")
            self.assertEqual(snapshot["analysis_notes"], ["当前版本更适合偏分析岗位。"])


if __name__ == "__main__":
    unittest.main()
