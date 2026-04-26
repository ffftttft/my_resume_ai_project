from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


DESKTOP_DIR = Path.home() / "Desktop"
OUTPUT_DIR = DESKTOP_DIR / "project_summary_assets"

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
    result: list[str] = []
    for paragraph in text.split("\n"):
        stripped = paragraph.strip()
        if not stripped:
            result.append("")
            continue
        result.extend(wrap(stripped, width=width, break_long_words=True, replace_whitespace=False))
    return result


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


def generate_highlight_board() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "项目总结亮点图",
        "围绕项目协作、技术突破、能力提升和后续演进四个方面，对本作品开发过程进行归纳。",
    )

    cards = [
        (
            "项目协作",
            ACCENT,
            "本项目从前端交互、后端接口、RAG 检索、ATS 评分到本地记忆机制逐步拆解，形成了较明确的模块边界。开发过程中通过把“生成、优化、评分、导出、历史恢复”拆成独立能力，降低了联调难度，也使项目更适合后续继续扩展。",
        ),
        (
            "克服困难",
            GREEN,
            "项目最大的难点并不只是调用大模型，而是如何让简历结果真正可用。开发中重点解决了结构化输出不稳定、岗位语义不明确、外部服务异常回退、实时交互反馈不足等问题，使系统从“能生成”提升到“能编辑、能评分、能恢复”。",
        ),
        (
            "能力提升",
            ORANGE,
            "通过本项目，团队在前后端协同、接口契约设计、流式交互、RAG 应用、测试验证和本地部署等方面均有明显提升。尤其是在把抽象算法能力转化为完整 Web 产品形态这件事上，工程理解和系统化思维都有了更强的积累。",
        ),
        (
            "后续升级",
            ACCENT,
            "后续可继续接入数据库实现多用户版本管理，补充 PDF 模板导出、岗位推荐、面试辅助和更完善的权限体系。若面向商业推广，还可向高校就业服务、求职训练营和简历辅导平台延伸，形成“生成 + 优化 + 评估 + 服务”一体化能力。",
        ),
    ]

    positions = [
        (110, 260, 1040, 610),
        (1160, 260, 2090, 610),
        (110, 690, 1040, 1190),
        (1160, 690, 2090, 1190),
    ]
    for (title_text, color, body), (x1, y1, x2, y2) in zip(cards, positions):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=28, fill=CARD, outline=BORDER, width=2)
        badge(draw, x1 + 28, y1 + 24, title_text, color)
        draw_para(draw, x1 + 28, y1 + 88, body, 31, size=24, color=TEXT)

    draw.rounded_rectangle((110, 1240, 2090, 1320), radius=22, fill=SOFT, outline=BORDER, width=2)
    badge(draw, 140, 1260, "总结", GREEN)
    tail = "整体来看，本作品完成了从需求识别、系统拆解、关键技术落地到测试验证的完整开发闭环，也为后续继续升级为正式产品打下了较好的基础。"
    draw_para(draw, 270, 1256, tail, 80, size=22, color=TEXT)

    image.save(OUTPUT_DIR / "project_summary_highlights.png")


def generate_markdown() -> None:
    text = """# 项目总结（可直接复制）

本作品的开发过程让我们更加清楚地认识到，真正有价值的 AI 应用并不是简单接入大模型，而是要围绕真实场景把“需求、数据、算法、交互、验证”完整打通。项目初期，我们以“求职简历生成”作为切入点，但在实际推进过程中发现，用户真正需要的并不是一段能写出来的文字，而是一份能够围绕目标岗位持续优化、能够通过 ATS 初筛、能够反复修改和保存版本的完整简历工作流。因此，项目逐步从单纯的文本生成工具演进为集岗位理解、RAG 检索、结构化生成、语义评分、历史恢复和导出能力于一体的智能简历优化系统。

在开发协同和任务分解方面，我们将系统拆解为前端工作台、后端接口层、ResumeService 编排层、RAG 检索服务、ATS 评分服务、文件解析服务和本地记忆模块等多个部分，尽量保证每个模块边界清晰、职责明确。这样的拆解方式一方面降低了联调复杂度，另一方面也提高了项目后续演进的可维护性。例如，前端负责“录入与展示”，后端负责“调度与返回”，而 RAG、ATS、ProfileMemory 等能力则可以独立迭代，这种模块化思路是本次开发中最有价值的经验之一。

项目过程中遇到的困难主要集中在三个方面。第一，通用大模型虽然能生成文本，但输出不稳定，无法直接支撑前端编辑与后续评分，因此我们强化了结构化契约设计，使结果更可解析、更可落地。第二，仅凭用户输入的 JD 难以保证岗位理解的准确性，因此我们补充了联网岗位检索和参考简历检索，提升系统对目标岗位的语义把握。第三，实际产品体验不能只看“最终答案”，还要看“等待过程”，所以我们加入了流式反馈、历史快照和草稿实验台，让系统从静态结果输出升级为可交互、可追踪的工作台模式。

从个人和团队能力提升来看，这个项目让我们在前后端协同、接口契约设计、AI 工程化、测试验证、本地部署和产品思维等方面都有了明显提升。尤其是在把算法能力转化为面向用户的 Web 应用过程中，我们更加理解了“可用性”和“工程稳定性”的重要性。相比单独完成一个算法实验或页面设计，本项目更像一次完整的软件工程实践，让我们学会了如何围绕真实问题持续打磨产品。

在后续升级方向上，本作品仍有较大的拓展空间。技术上，可以继续引入数据库实现多用户隔离和简历版本管理，补充 PDF 模板导出、面试辅助、岗位推荐和更完善的权限控制；产品上，可以向高校就业指导、简历辅导、职业训练营等场景延伸，形成“生成 + 优化 + 评估 + 服务”的一体化解决方案。总体而言，本项目不仅完成了既定功能目标，也让我们在实践中积累了从需求分析到系统落地的完整经验，为后续继续向真实产品升级打下了基础。
"""
    (OUTPUT_DIR / "project_summary_copy.md").write_text(text, encoding="utf-8")


def generate_readme() -> None:
    content = [
        "项目总结素材清单",
        "",
        "正文：",
        "1. project_summary_copy.md",
        "",
        "配图：",
        "2. project_summary_highlights.png",
    ]
    (OUTPUT_DIR / "README.txt").write_text("\n".join(content), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generate_highlight_board()
    generate_markdown()
    generate_readme()


if __name__ == "__main__":
    main()
