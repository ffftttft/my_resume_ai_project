from __future__ import annotations

import json
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


DESKTOP_DIR = Path.home() / "Desktop"
OUTPUT_DIR = DESKTOP_DIR / "test_report_assets"
METRICS_PATH = OUTPUT_DIR / "performance_metrics.json"

W = 2200
H = 1400
BG = "#F5F8FF"
TEXT = "#1F2A44"
MUTED = "#66728A"
ACCENT = "#5B8CFF"
GREEN = "#37B17A"
ORANGE = "#FFAA47"
CARD = "#FFFFFF"
BORDER = "#D6E0F5"
SOFT = "#E8F0FF"


def find_font(bold: bool = False) -> str:
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/simsun.ttc",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return path
    raise FileNotFoundError("No usable font found.")


FONT_REG = find_font(False)
FONT_BOLD = find_font(True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((32, 32, W - 32, H - 32), radius=32, fill=BG, outline=BORDER, width=2)
    return image, draw


def draw_title(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    draw.text((90, 70), title, fill=TEXT, font=font(48, True))
    draw.text((92, 138), subtitle, fill=MUTED, font=font(22))
    draw.line((90, 186, W - 90, 186), fill=BORDER, width=2)


def lines(text: str, width: int) -> list[str]:
    output: list[str] = []
    for part in text.split("\n"):
        stripped = part.strip()
        if not stripped:
            output.append("")
            continue
        output.extend(wrap(stripped, width=width, break_long_words=True, replace_whitespace=False))
    return output


def draw_para(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    width: int,
    *,
    size: int = 22,
    color: str = TEXT,
    gap: int = 8,
) -> int:
    for line in lines(text, width):
        draw.text((x, y), line, fill=color, font=font(size))
        y += size + gap
    return y


def badge(draw: ImageDraw.ImageDraw, x: int, y: int, text_value: str, color: str) -> None:
    f = font(18, True)
    left, top, right, bottom = draw.textbbox((0, 0), text_value, font=f)
    width = right - left + 36
    draw.rounded_rectangle((x, y, x + width, y + 38), radius=18, fill=color)
    draw.text((x + 18, y + 8), text_value, fill="#FFFFFF", font=f)


def load_metrics() -> dict:
    for encoding in ("utf-8", "utf-16", "utf-16-le", "utf-16-be"):
        try:
            return json.loads(METRICS_PATH.read_text(encoding=encoding))
        except Exception:
            continue
    raise UnicodeDecodeError("metrics", b"", 0, 1, "Unable to decode performance_metrics.json")


def generate_case_table() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "主要测试用例表",
        "测试时间：2026-04-19。覆盖接口契约、历史版本、RAG 检索、ATS 评分、联网岗位检索和真实搜索能力。",
    )

    columns = [
        ("测试类型", 250),
        ("测试内容", 620),
        ("测试过程", 620),
        ("测试结果", 520),
    ]
    rows = [
        [
            "单元/回归测试",
            "使用 unittest 运行 backend/tests 中的 11 个测试，覆盖契约校验、日期归一化、快照持久化、RAG 返回结构、ATS 回退逻辑。",
            "执行 `python -m unittest discover -s backend/tests -p \"test_*.py\" -v`。",
            "11 项全部通过，耗时 0.044s，核心数据结构和回归能力稳定。",
        ],
        [
            "岗位检索集成测试",
            "验证无 API Key 降级、错误 API Key 回退、Query 构建、缓存机制、Prompt Context 组装。",
            "执行 `python backend/tests/test_job_search_integration.py`，并设置 `PYTHONIOENCODING=utf-8`。",
            "5 个场景全部通过，能正确在禁用、错误凭据和正常逻辑间切换。",
        ],
        [
            "真实联网验证",
            "使用真实 Tavily 检索岗位信息，检查是否能返回可用来源、标题、链接和摘要。",
            "执行 `python backend/tests/test_real_tavily.py`，测试“字节跳动后端开发工程师”“阿里巴巴算法工程师”两个查询。",
            "两组查询均返回 3 条结果，联网岗位情报真实可用。",
        ],
        [
            "接口性能测试",
            "对健康检查、内存读取、RAG 检索、ATS 评分、本地前端主页分别采样 5 次。",
            "通过本地脚本循环请求 `127.0.0.1:8000` 和 `127.0.0.1:5173`。",
            "各接口平均响应时间均控制在 15ms 内，适合本地演示与交互。",
        ],
        [
            "问题修正验证",
            "定位 Windows 终端 GBK 输出导致的 UnicodeEncodeError。",
            "在脚本测试阶段切换 `PYTHONIOENCODING=utf-8` 后重跑联网测试。",
            "确认报错来自终端编码而非业务逻辑，修正后测试可完整输出并通过。",
        ],
    ]

    start_x = 90
    header_y = 240
    row_height = 190
    gap = 16

    x = start_x
    for title_text, width in columns:
        draw.rounded_rectangle((x, header_y, x + width, header_y + 74), radius=18, fill=ACCENT)
        draw.text((x + 22, header_y + 20), title_text, fill="#FFFFFF", font=font(24, True))
        x += width + gap

    for idx, row in enumerate(rows):
        top = header_y + 96 + idx * (row_height + 16)
        x = start_x
        for cell_idx, cell_text in enumerate(row):
            width = columns[cell_idx][1]
            fill = CARD if idx % 2 == 0 else "#F9FBFF"
            draw.rounded_rectangle((x, top, x + width, top + row_height), radius=22, fill=fill, outline=BORDER, width=2)
            if cell_idx == 0:
                draw.text((x + 20, top + 24), cell_text, fill=TEXT, font=font(26, True))
            else:
                draw_para(draw, x + 20, top + 20, cell_text, 20 if cell_idx == 1 else 21, size=21, color=MUTED)
            x += width + gap

    image.save(OUTPUT_DIR / "test_cases_table.png")


def generate_metrics_table() -> None:
    metrics = load_metrics()
    image, draw = canvas()
    draw_title(
        draw,
        "技术指标表",
        "运行速度指标基于本机实测；安全性、扩展性、部署方便性和可用性结合测试结果与系统实现进行归纳。",
    )

    metrics_rows = [
        ["运行速度", f"健康检查平均 {metrics['health']['avg_ms']} ms；内存读取平均 {metrics['memory']['avg_ms']} ms；RAG 检索平均 {metrics['rag_search']['avg_ms']} ms；ATS 评分平均 {metrics['ats_score']['avg_ms']} ms；前端主页平均 {metrics['frontend_home']['avg_ms']} ms。"],
        ["安全性", "严格契约校验可拦截未知字段输入；Embedding 不可用时自动回退到关键词匹配；联网检索在无 Key 或无效 Key 下均能优雅降级，不会导致主流程崩溃。"],
        ["扩展性", "服务按 ResumeService、RagService、SemanticATSService、JobSearchService、MemoryService 解耦，后续可替换向量库、模型提供商或数据库持久层。"],
        ["部署方便性", "支持前后端本地分离启动，也支持一键脚本准备环境并启动；当前原型不依赖独立数据库，评审现场部署门槛低。"],
        ["可用性", "提供新建简历和现有简历优化双模式，支持历史快照、结果恢复、MD/TXT 导出和实时进度反馈，适合边生成边修改的使用方式。"],
    ]

    left_x = 120
    top_y = 260
    label_w = 260
    value_w = 1680
    row_h = 180
    for idx, (label, value) in enumerate(metrics_rows):
        y = top_y + idx * (row_h + 22)
        draw.rounded_rectangle((left_x, y, left_x + label_w, y + row_h), radius=24, fill=ACCENT if idx % 2 == 0 else GREEN)
        draw.text((left_x + 34, y + 64), label, fill="#FFFFFF", font=font(30, True))
        draw.rounded_rectangle((left_x + label_w + 20, y, left_x + label_w + 20 + value_w, y + row_h), radius=24, fill=CARD, outline=BORDER, width=2)
        draw_para(draw, left_x + label_w + 50, y + 26, value, 48, size=24, color=TEXT)

    note = "说明：技术指标以当前 Windows 本地演示环境为准。若切换为云端部署或接入正式数据库，响应时间和扩展能力会随配置变化。"
    draw.rounded_rectangle((120, 1240, W - 120, 1320), radius=24, fill=SOFT, outline=BORDER, width=2)
    badge(draw, 150, 1260, "指标说明", ORANGE)
    draw_para(draw, 300, 1256, note, 70, size=22, color=TEXT)

    image.save(OUTPUT_DIR / "technical_metrics_table.png")


def generate_fix_table() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "测试问题与修正记录",
        "测试报告不仅记录结果，也记录在测试过程中暴露出的实际问题及对应修正方式。",
    )

    rows = [
        (
            "问题 1",
            "Windows PowerShell 默认 GBK 编码无法正确输出测试脚本中的“✓、❌、📍”等字符，导致联网测试脚本中断。",
            "将测试执行环境切换为 `PYTHONIOENCODING=utf-8`，再次运行 `test_job_search_integration.py` 与 `test_real_tavily.py`。",
            "脚本输出恢复正常，业务逻辑验证全部通过。该问题属于终端编码问题，不影响系统主流程。",
        ),
        (
            "问题 2",
            "大模型与向量服务在异常状态下可能导致 ATS 评分或结构化输出中断。",
            "通过既有回归测试验证 Embedding 失败时自动进入 lexical fallback，并保留友好 warning。",
            "确认评分模块具备回退能力，避免外部依赖异常导致前端不可用。",
        ),
        (
            "问题 3",
            "求职 JD 中可能出现噪声短词，直接纳入反馈会降低 ATS 建议质量。",
            "通过回归测试验证两字符歧义词不会进入缺失关键词和优化建议。",
            "提高了 ATS 反馈可读性，减少误导性优化建议。",
        ),
    ]

    y = 260
    for idx, (tag, issue, fix, result) in enumerate(rows):
        accent = [ACCENT, GREEN, ORANGE][idx % 3]
        draw.rounded_rectangle((120, y, 2080, y + 300), radius=28, fill=CARD, outline=BORDER, width=2)
        badge(draw, 150, y + 28, tag, accent)
        draw.text((150, y + 90), "暴露问题", fill=TEXT, font=font(26, True))
        draw.text((150, y + 168), "处理方式", fill=TEXT, font=font(26, True))
        draw.text((1120, y + 90), "修正结果", fill=TEXT, font=font(26, True))
        draw_para(draw, 310, y + 88, issue, 40, size=24, color=MUTED)
        draw_para(draw, 310, y + 166, fix, 40, size=24, color=MUTED)
        draw_para(draw, 1280, y + 88, result, 30, size=24, color=TEXT)
        y += 336

    image.save(OUTPUT_DIR / "issue_fix_table.png")


def generate_markdown() -> None:
    metrics = load_metrics()
    content = f"""# 测试报告（可直接复制）

## 1. 测试概述
为保证作品质量，本项目围绕“结构化生成是否稳定、历史数据是否可恢复、联网岗位检索是否可用、ATS 评分是否可回退、系统交互是否流畅”五类问题进行了测试。测试时间为 2026 年 4 月 19 日，测试环境为本机 Windows 本地运行环境，前端地址为 `http://127.0.0.1:5173`，后端地址为 `http://127.0.0.1:8000`。

## 2. 主要测试过程与结果
首先，使用 `unittest` 对 `backend/tests` 下的回归测试进行统一执行，共运行 11 个测试用例，覆盖输入契约校验、结构化结果校验、日期归一化、快照持久化、RAG 检索结果结构、ATS 回退策略等内容，测试结果为 11 项全部通过，执行耗时 0.044 秒。该结果表明系统在核心数据结构和关键服务层面的稳定性较好。

其次，对联网岗位检索能力进行了两类验证。一类是集成测试，主要检查无 API Key 时是否能正常降级、错误 API Key 时是否能友好回退、Query 构建逻辑是否正确、缓存机制和 Prompt Context 是否正常；相关测试在设置 `PYTHONIOENCODING=utf-8` 后全部通过。另一类是真实联网测试，分别以“字节跳动后端开发工程师”和“阿里巴巴算法工程师”为查询条件进行搜索，均返回 3 条有效结果，说明系统的岗位情报检索功能在真实网络环境下可正常工作。

最后，对本地运行速度进行了采样测试。通过对健康检查、内存读取、RAG 检索、ATS 评分和前端主页分别进行 5 次请求采样，测得健康检查平均响应时间为 {metrics['health']['avg_ms']} ms，内存读取平均响应时间为 {metrics['memory']['avg_ms']} ms，RAG 检索平均响应时间为 {metrics['rag_search']['avg_ms']} ms，ATS 评分平均响应时间为 {metrics['ats_score']['avg_ms']} ms，前端主页平均加载时间为 {metrics['frontend_home']['avg_ms']} ms。结果表明，在当前本地原型环境下，系统具备较快的交互响应能力。

## 3. 修正过程
测试过程中发现，Windows PowerShell 默认 GBK 输出编码无法正确打印测试脚本中的特殊字符，导致联网测试脚本发生 `UnicodeEncodeError`。经排查，该问题来源于终端编码而非业务逻辑。通过设置 `PYTHONIOENCODING=utf-8` 后，联网测试脚本即可完整运行，真实联网搜索和集成测试均顺利通过。除此之外，系统已通过既有回归测试验证 ATS 在 Embedding 不可用时的关键词回退逻辑，以及对两字符歧义关键词的过滤逻辑，保证在外部依赖异常或噪声输入情况下仍能维持较好的可用性。

## 4. 技术指标
在运行速度方面，系统核心接口平均响应时间均控制在 15 ms 以内，满足本地原型演示与交互式使用要求。在安全性方面，系统采用严格请求契约校验，能够拒绝未知字段输入；联网岗位检索在无 Key 或无效 Key 时均可优雅降级；评分模块在语义向量不可用时自动切换到关键词匹配策略，避免主流程中断。在扩展性方面，系统采用服务解耦设计，后续可替换模型提供商、向量检索后端或数据库方案。在部署方便性方面，当前系统不依赖独立数据库，支持一键准备环境和本地快速运行，适合评审现场验证。在可用性方面，系统支持新建简历与现有简历优化双模式，并具备历史快照、结果恢复、文本导出和实时进度反馈能力，整体使用流程完整。
"""
    (OUTPUT_DIR / "test_report_copy.md").write_text(content, encoding="utf-8")


def generate_readme() -> None:
    lines = [
        "测试报告素材清单",
        "",
        "正文：",
        "1. test_report_copy.md",
        "",
        "表格：",
        "2. test_cases_table.png",
        "3. technical_metrics_table.png",
        "4. issue_fix_table.png",
        "",
        "原始结果：",
        "5. unit_tests_output.txt",
        "6. job_search_integration_output.txt",
        "7. real_tavily_output.txt",
        "8. performance_metrics.json",
    ]
    (OUTPUT_DIR / "README.txt").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generate_case_table()
    generate_metrics_table()
    generate_fix_table()
    generate_markdown()
    generate_readme()


if __name__ == "__main__":
    main()
