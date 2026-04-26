from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


DESKTOP_DIR = Path.home() / "Desktop"
OUTPUT_DIR = DESKTOP_DIR / "install_usage_assets"

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


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str = ACCENT) -> None:
    sx, sy = start
    ex, ey = end
    draw.line((sx, sy, ex, ey), fill=color, width=6)
    if abs(ex - sx) > abs(ey - sy):
        direction = 1 if ex >= sx else -1
        draw.polygon([(ex, ey), (ex - 24 * direction, ey - 12), (ex - 24 * direction, ey + 12)], fill=color)
    else:
        direction = 1 if ey >= sy else -1
        draw.polygon([(ex, ey), (ex - 12, ey - 24 * direction), (ex + 12, ey - 24 * direction)], fill=color)


def generate_env_table() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "安装环境要求表",
        "当前提交版本已验证 Windows 本地运行模式，支持一键启动，也支持前后端手动分离启动。",
    )

    columns = [
        ("项目", 260),
        ("要求", 520),
        ("说明", 760),
        ("本次验证情况", 480),
    ]
    rows = [
        ["操作系统", "Windows 环境", "一键脚本 `start_local.ps1 / .bat` 基于 PowerShell 设计。", "已在 Windows 本机验证通过"],
        ["Python", "已安装 `python` 命令", "后端依赖 FastAPI、uvicorn、openai、pypdf、python-pptx 等组件。", "本机已验证 `Python 3.14.3`"],
        ["Node.js / npm", "已安装 `npm` 命令", "前端基于 `frontend_app/` 目录下的 Vite + React 工程。", "本机已验证 `npm 11.11.0`"],
        ["网络", "默认本地可运行；联网功能需外网", "若配置 OpenAI / Tavily，可启用真实 AI 与岗位检索；未配置时仍可本地兜底演示。", "本次后端健康检查与联网检索均已验证"],
        ["端口", "确保 5173 与 8000 可用", "前端默认地址 `http://localhost:5173`，后端默认地址 `http://127.0.0.1:8000`。", "两端口当前可正常访问"],
    ]

    start_x = 90
    top_y = 240
    gap = 16
    row_h = 170
    x = start_x
    for title_text, width in columns:
        draw.rounded_rectangle((x, top_y, x + width, top_y + 74), radius=18, fill=ACCENT)
        draw.text((x + 22, top_y + 20), title_text, fill="#FFFFFF", font=font(24, True))
        x += width + gap

    for idx, row in enumerate(rows):
        top = top_y + 96 + idx * (row_h + 16)
        x = start_x
        for cell_idx, cell_text in enumerate(row):
            width = columns[cell_idx][1]
            fill = CARD if idx % 2 == 0 else "#F9FBFF"
            draw.rounded_rectangle((x, top, x + width, top + row_h), radius=22, fill=fill, outline=BORDER, width=2)
            if cell_idx == 0:
                draw.text((x + 20, top + 22), cell_text, fill=TEXT, font=font(26, True))
            else:
                draw_para(draw, x + 20, top + 18, cell_text, 18 if cell_idx == 1 else 24, size=21, color=MUTED)
            x += width + gap

    draw.rounded_rectangle((90, 1220, W - 90, 1320), radius=24, fill=SOFT, outline=BORDER, width=2)
    badge(draw, 118, 1250, "补充说明", ORANGE)
    note = "当前实际主前端目录为 `frontend_app/`。若使用一键脚本，则无需手动区分前后端目录；脚本会自动补齐 `.env` 并安装依赖。"
    draw_para(draw, 300, 1246, note, 68, size=22, color=TEXT)

    image.save(OUTPUT_DIR / "environment_requirements_table.png")


def generate_install_table() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "安装方式与启动步骤",
        "建议优先采用默认安装方式；若需要调试或分离启动，可采用手动方式。",
    )

    cards = [
        (
            "默认安装",
            GREEN,
            "1. 双击 start_local.bat。\n2. 脚本自动创建 backend/.env 与 frontend_app/.env。\n3. 自动检查并安装后端依赖与前端依赖。\n4. 自动启动后端窗口和前端窗口。\n5. 自动打开浏览器访问 http://localhost:5173。",
            "适合评审现场快速演示，操作最少。",
        ),
        (
            "仅做环境准备",
            ACCENT,
            "执行：\npowershell -ExecutionPolicy Bypass -File .\\start_local.ps1 -PrepareOnly\n\n作用：\n只安装依赖并补齐环境文件，不立即打开前后端窗口。",
            "适合先准备环境、后手动启动。",
        ),
        (
            "手动启动后端",
            ORANGE,
            "执行：\npython -m pip install -r backend\\requirements.txt\nCopy-Item backend\\.env.example backend\\.env\npython backend\\run_local.py\n\n后端地址：http://127.0.0.1:8000",
            "适合调试接口与日志。",
        ),
        (
            "手动启动前端",
            ACCENT,
            "执行：\ncd frontend_app\nnpm install\nCopy-Item .env.example .env\nnpm run dev\n\n前端地址：http://localhost:5173",
            "适合单独调试界面与交互。",
        ),
    ]

    positions = [
        (110, 260, 1040, 570),
        (1160, 260, 2090, 570),
        (110, 630, 1040, 1200),
        (1160, 630, 2090, 1200),
    ]
    for (title_text, color, body, note), (x1, y1, x2, y2) in zip(cards, positions):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=28, fill=CARD, outline=BORDER, width=2)
        badge(draw, x1 + 26, y1 + 24, title_text, color)
        draw_para(draw, x1 + 26, y1 + 88, body, 30, size=24, color=TEXT)
        draw.rounded_rectangle((x1 + 26, y2 - 84, x2 - 26, y2 - 26), radius=18, fill=SOFT, outline=BORDER, width=2)
        draw_para(draw, x1 + 44, y2 - 70, note, 34, size=20, color=MUTED)

    image.save(OUTPUT_DIR / "installation_methods_table.png")


def generate_usage_flow() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "典型使用流程图",
        "以下流程适合评审现场演示，也适合普通用户从零体验完整功能。",
    )

    steps = [
        ("1", "启动系统", "双击 `start_local.bat` 或手动启动前后端"),
        ("2", "进入系统", "浏览器访问 `http://localhost:5173`"),
        ("3", "选择模式", "在“新建简历”和“优化简历”之间切换"),
        ("4", "录入信息", "进入编辑页填写岗位、JD、技能、项目或上传原简历"),
        ("5", "执行生成", "返回工作台点击“生成简历”或“开始优化”"),
        ("6", "查看结果", "观察 ATS 仪表盘、AI 进度、结构化结果与草稿实验台"),
        ("7", "保存导出", "保存快照、恢复历史或导出 MD / TXT"),
    ]
    xs = [90, 390, 690, 990, 1290, 1590, 1890]
    y = 470
    box_w = 240
    box_h = 250
    for idx, ((num, title_text, body), x) in enumerate(zip(steps, xs)):
        color = [ACCENT, GREEN, ORANGE][idx % 3]
        draw.rounded_rectangle((x, y, x + box_w, y + box_h), radius=28, fill=CARD, outline=BORDER, width=2)
        badge(draw, x + 22, y + 20, num, color)
        draw.text((x + 22, y + 86), title_text, fill=TEXT, font=font(28, True))
        draw_para(draw, x + 22, y + 134, body, 10, size=20, color=MUTED)
        if idx < len(steps) - 1:
            draw_arrow(draw, (x + box_w, y + box_h // 2), (xs[idx + 1] - 16, y + box_h // 2), color=color)

    draw.rounded_rectangle((120, 980, W - 120, 1230), radius=26, fill=SOFT, outline=BORDER, width=2)
    badge(draw, 150, 1012, "使用提示", GREEN)
    tips = (
        "若未配置 `OPENAI_API_KEY`，系统仍可进入本地兜底模式，完整演示“追问 → 生成 → 修改 → 导出”的流程；"
        "若已配置 OpenAI 和 Tavily，则可展示真实 AI 生成与联网岗位检索能力。"
    )
    draw_para(draw, 320, 1008, tips, 70, size=24, color=TEXT)

    image.save(OUTPUT_DIR / "typical_usage_flow.png")


def generate_quick_ref() -> None:
    image, draw = canvas()
    draw_title(
        draw,
        "命令速查表",
        "适合直接放入作品说明书，便于评委现场按命令快速验证。",
    )

    sections = [
        (
            "一键准备环境",
            ACCENT,
            "powershell -ExecutionPolicy Bypass -File .\\start_local.ps1 -PrepareOnly",
            "自动补齐 `.env` 并安装前后端依赖，不立即打开浏览器。",
        ),
        (
            "一键启动",
            GREEN,
            "start_local.bat",
            "最推荐的验证方式，自动启动后端、前端并打开浏览器。",
        ),
        (
            "后端启动",
            ORANGE,
            "python backend\\run_local.py",
            "服务地址：http://127.0.0.1:8000，用于 API 验证。",
        ),
        (
            "前端启动",
            ACCENT,
            "cd frontend_app\nnpm run dev",
            "页面地址：http://localhost:5173，用于界面交互验证。",
        ),
        (
            "健康检查",
            GREEN,
            "GET http://127.0.0.1:8000/api/health",
            "用于确认后端和模型配置是否正常。",
        ),
    ]

    y = 250
    for title_text, color, command, note in sections:
        draw.rounded_rectangle((120, y, 2080, y + 175), radius=24, fill=CARD, outline=BORDER, width=2)
        badge(draw, 150, y + 24, title_text, color)
        draw.rounded_rectangle((150, y + 72, 1250, y + 142), radius=18, fill="#F9FBFF", outline=BORDER, width=2)
        draw_para(draw, 176, y + 88, command, 55, size=26, color=TEXT)
        draw_para(draw, 1310, y + 88, note, 30, size=22, color=MUTED)
        y += 205

    image.save(OUTPUT_DIR / "quick_commands_table.png")


def generate_markdown() -> None:
    text = """# 安装及使用（可直接复制）

## 1. 安装环境要求
本作品支持 Windows 本地运行模式，当前提交版本已在本机 PowerShell 环境下完成验证。运行前需要保证系统已安装 `python` 和 `npm` 命令，其中 Python 用于启动 FastAPI 后端，Node.js / npm 用于启动基于 Vite 的前端工程。当前默认前端目录为 `frontend_app/`，后端目录为 `backend/`。此外，还需要确保 `5173` 和 `8000` 端口未被其他程序长期占用，便于前后端正常启动。

若已配置 `backend/.env` 中的 `OPENAI_API_KEY`，系统会优先调用真实模型；若未配置，系统仍可自动切换到本地兜底模式，因此评审现场即使不接入真实模型，也可以完整演示“追问、生成、修改、导出”的流程。若需要启用联网岗位检索，则需要进一步配置 Tavily 相关参数并保证外网可用。

## 2. 默认安装方式
默认安装方式推荐直接双击项目根目录下的 `start_local.bat`。该方式会自动调用 `start_local.ps1`，完成环境文件补齐、依赖检查、后端启动、前端启动以及浏览器自动打开，是最适合评审现场快速验证的方式。若只希望先安装依赖、不立即打开浏览器和服务窗口，可以执行：

`powershell -ExecutionPolicy Bypass -File .\\start_local.ps1 -PrepareOnly`

该命令会自动创建 `backend/.env` 与 `frontend_app/.env`，并在依赖缺失时安装后端和前端所需组件，为后续手动启动做好准备。

## 3. 手动安装与启动
若需要单独调试后端，可在项目根目录下执行：

`python -m pip install -r backend\\requirements.txt`
`Copy-Item backend\\.env.example backend\\.env`
`python backend\\run_local.py`

后端默认访问地址为 `http://127.0.0.1:8000`。

若需要单独调试前端，可执行：

`cd frontend_app`
`npm install`
`Copy-Item .env.example .env`
`npm run dev`

前端默认访问地址为 `http://localhost:5173`。

## 4. 典型使用流程
系统启动后，用户先在浏览器中进入首页工作台，再根据需求选择“新建简历”或“优化简历”模式。随后进入编辑页，填写目标公司、目标岗位、岗位要求以及候选人资料；如果是优化模式，还可以上传已有简历作为优化基础。信息录入完成后，回到工作台点击“生成简历”或“开始优化”，系统会在右侧 AI 进度区实时展示处理阶段，同时在中部工作台展示 ATS 评分、结构化结果和简历草稿。生成完成后，用户可以继续手动改写，也可以保存快照、恢复历史版本，或导出为 MD / TXT 文件。

## 5. 验证方式
评审现场建议优先采用一键启动方式，并通过以下两项快速确认系统正常运行：
1. 浏览器能够正常打开 `http://localhost:5173`；
2. 访问 `http://127.0.0.1:8000/api/health` 返回健康检查结果。

当前项目已经实际验证 `start_local.ps1 -PrepareOnly` 可以正常完成环境准备，同时前端主页与后端健康检查接口均可正常访问，因此安装流程和基本使用流程是可执行的。
"""
    (OUTPUT_DIR / "install_usage_copy.md").write_text(text, encoding="utf-8")


def generate_readme() -> None:
    items = [
        "安装及使用素材清单",
        "",
        "正文：",
        "1. install_usage_copy.md",
        "",
        "表格/流程图：",
        "2. environment_requirements_table.png",
        "3. installation_methods_table.png",
        "4. typical_usage_flow.png",
        "5. quick_commands_table.png",
    ]
    (OUTPUT_DIR / "README.txt").write_text("\n".join(items), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generate_env_table()
    generate_install_table()
    generate_usage_flow()
    generate_quick_ref()
    generate_markdown()
    generate_readme()


if __name__ == "__main__":
    main()
