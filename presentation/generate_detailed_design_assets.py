from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


DESKTOP_DIR = Path.home() / "Desktop"
OUTPUT_DIR = DESKTOP_DIR / "detailed_design_assets"

W = 2200
H = 1400
BG = "#F5F8FF"
TEXT = "#1F2A44"
MUTED = "#66728A"
ACCENT = "#5B8CFF"
ACCENT_SOFT = "#E8F0FF"
ACCENT_GREEN = "#37B17A"
ACCENT_ORANGE = "#FFAA47"
CARD = "#FFFFFF"
BORDER = "#D6E0F5"


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


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
    raise FileNotFoundError("No suitable font found.")


FONT_REGULAR = find_font(False)
FONT_BOLD = find_font(True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def new_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((32, 32, W - 32, H - 32), radius=32, fill=BG, outline=BORDER, width=2)
    return image, draw


def draw_title(draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> None:
    draw.text((90, 70), title, fill=TEXT, font=font(48, True))
    draw.text((92, 138), subtitle, fill=MUTED, font=font(22))
    draw.line((90, 186, W - 90, 186), fill=BORDER, width=2)


def wrapped_lines(text: str, per_line: int) -> list[str]:
    items: list[str] = []
    for paragraph in text.split("\n"):
        stripped = paragraph.strip()
        if not stripped:
            items.append("")
            continue
        items.extend(wrap(stripped, width=per_line, break_long_words=True, replace_whitespace=False))
    return items


def draw_block_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    per_line: int,
    *,
    font_size: int = 22,
    fill: str = TEXT,
    line_gap: int = 12,
) -> int:
    x, y = xy
    use_font = font(font_size)
    for line in wrapped_lines(text, per_line):
        draw.text((x, y), line, fill=fill, font=use_font)
        y += font_size + line_gap
    return y


def draw_badge(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text_value: str, color: str) -> None:
    x, y = xy
    f = font(18, True)
    left, top, right, bottom = draw.textbbox((x, y), text_value, font=f)
    width = right - left + 36
    draw.rounded_rectangle((x, y, x + width, y + 38), radius=18, fill=color)
    draw.text((x + 18, y + 8), text_value, fill="#FFFFFF", font=f)


def generate_storage_table() -> None:
    image, draw = new_canvas()
    draw_title(
        draw,
        "本地存储设计表",
        "当前作品未引入独立数据库，而是采用 JSON + 本地文件目录的轻量持久化方案，便于评审现场部署、恢复和验证。",
    )

    columns = [
        ("存储对象", 270),
        ("核心字段", 700),
        ("用途", 520),
        ("设计说明", 540),
    ]

    rows = [
        [
            "memory.json",
            "workspace_draft\nuploaded_files\nresume_snapshots\ndownloaded_artifacts\ngenerated_modules",
            "保存工作区草稿、上传记录、快照版本、导出记录和模块状态",
            "单文件持久化，便于本地演示与快速恢复，不依赖额外数据库服务",
        ],
        [
            "profile_memory.json",
            "target_roles\ntarget_companies\nskills\nproject_keywords\nfact_guards",
            "保存压缩后的用户画像，用于追问、二次生成和多轮上下文延续",
            "采用紧凑存储，避免模型上下文无限膨胀",
        ],
        [
            "backend/uploads/",
            "saved_name\noriginal_name\nfile_type\ntodo_notice",
            "保存 PDF、PPTX 等原始材料，支持预览、删除和回溯",
            "与业务记录分离，便于文件管理和异常清理",
        ],
        [
            "参考简历库",
            "source_title\nsummary\nskills\nexperience\nsource_note",
            "为 RAG 检索提供匿名化参考案例，增强生成质量",
            "支持本地 JSON 检索，也可平滑迁移到 ChromaDB 持久层",
        ],
    ]

    start_x = 90
    start_y = 240
    row_height = 210

    current_x = start_x
    for title_text, width in columns:
        draw.rounded_rectangle((current_x, start_y, current_x + width, start_y + 74), radius=18, fill=ACCENT, outline=ACCENT)
        draw.text((current_x + 22, start_y + 20), title_text, fill="#FFFFFF", font=font(24, True))
        current_x += width + 16

    for row_index, row in enumerate(rows):
        top = start_y + 96 + row_index * (row_height + 16)
        current_x = start_x
        for cell_index, cell_text in enumerate(row):
            width = columns[cell_index][1]
            fill = CARD if row_index % 2 == 0 else "#F9FBFF"
            draw.rounded_rectangle((current_x, top, current_x + width, top + row_height), radius=20, fill=fill, outline=BORDER, width=2)
            if cell_index == 0:
                draw.text((current_x + 22, top + 24), cell_text, fill=TEXT, font=font(26, True))
            else:
                draw_block_text(draw, (current_x + 22, top + 20), cell_text, 23 if cell_index == 1 else 18, font_size=22, fill=MUTED)
            current_x += width + 16

    note_top = 1220
    draw.rounded_rectangle((90, note_top, W - 90, note_top + 112), radius=24, fill=ACCENT_SOFT, outline=BORDER, width=2)
    draw_badge(draw, (112, note_top + 22), "设计说明", ACCENT_GREEN)
    note = (
        "当前作品定位为单机可运行原型，因此优先采用轻量持久化方案。该方案降低了部署门槛，便于评委现场验证；"
        "当系统扩展为多用户版本时，可将 memory.json、profile_memory.json 等结构平滑迁移至 MySQL 或 PostgreSQL。"
    )
    draw_block_text(draw, (280, note_top + 28), note, 60, font_size=22, fill=TEXT, line_gap=10)

    image.save(OUTPUT_DIR / "storage_design_table.png")


def draw_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color: str = ACCENT) -> None:
    sx, sy = start
    ex, ey = end
    draw.line((sx, sy, ex, ey), fill=color, width=6)
    if abs(ex - sx) > abs(ey - sy):
        direction = 1 if ex >= sx else -1
        draw.polygon(
            [(ex, ey), (ex - 24 * direction, ey - 12), (ex - 24 * direction, ey + 12)],
            fill=color,
        )
    else:
        direction = 1 if ey >= sy else -1
        draw.polygon(
            [(ex, ey), (ex - 12, ey - 24 * direction), (ex + 12, ey - 24 * direction)],
            fill=color,
        )


def draw_card_box(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    title_text: str,
    body_text: str,
    accent: str,
) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=28, fill=CARD, outline=BORDER, width=2)
    badge_font = font(22, True)
    badge_left, badge_top, badge_right, badge_bottom = draw.textbbox((0, 0), title_text, font=badge_font)
    badge_width = max(152, badge_right - badge_left + 44)
    draw.rounded_rectangle((x1 + 18, y1 + 18, x1 + 18 + badge_width, y1 + 58), radius=18, fill=accent)
    draw.text((x1 + 38, y1 + 28), title_text, fill="#FFFFFF", font=badge_font)
    draw_block_text(draw, (x1 + 28, y1 + 84), body_text, 17, font_size=26, fill=TEXT)


def generate_storage_relation() -> None:
    image, draw = new_canvas()
    draw_title(
        draw,
        "持久化关系图",
        "系统围绕 ResumeService 进行编排，分别把草稿状态、压缩画像、上传文件和参考知识库拆分存储，降低耦合并便于回溯。",
    )

    draw_card_box(draw, (120, 290, 540, 500), "输入层", "用户资料录入\n上传 PDF / PPTX\n手动改写与导出", ACCENT)
    draw_card_box(draw, (700, 250, 1180, 540), "编排层", "ResumeService\n统一调度生成、评分、追问、历史记录", ACCENT_GREEN)
    draw_card_box(draw, (1360, 220, 2050, 420), "memory.json", "工作区草稿\n简历快照\n导出记录\n模块状态", ACCENT)
    draw_card_box(draw, (1360, 470, 2050, 670), "profile_memory.json", "目标岗位偏好\n技能关键词\n项目关键词\n事实约束", ACCENT_ORANGE)
    draw_card_box(draw, (1360, 720, 2050, 920), "backend/uploads", "原始简历文件\n项目附件\n解析后的预览来源", ACCENT_GREEN)
    draw_card_box(draw, (700, 760, 1180, 1060), "知识层", "RagService\nProfileMemoryService\nFileService\nMemoryService", ACCENT_ORANGE)
    draw_card_box(draw, (120, 820, 540, 1060), "参考知识库", "匿名参考简历库\n本地 JSON / ChromaDB\n岗位表达范式", ACCENT)

    draw_arrow(draw, (540, 395), (700, 395))
    draw_arrow(draw, (940, 540), (940, 760))
    draw_arrow(draw, (1180, 360), (1360, 320))
    draw_arrow(draw, (1180, 450), (1360, 540))
    draw_arrow(draw, (1180, 900), (1360, 820))
    draw_arrow(draw, (540, 940), (700, 910))
    draw_arrow(draw, (940, 760), (540, 940), color=ACCENT_GREEN)

    note = (
        "该设计并未严格采用数据库三范式，而是按‘评审可运行、状态可恢复、文件可追踪’的原则做工程取舍。"
        "对于当前单用户原型，该方案比引入数据库更轻量；对于后续平台化版本，可按服务边界拆表迁移。"
    )
    draw.rounded_rectangle((90, 1180, W - 90, 1320), radius=24, fill="#FFFFFF", outline=BORDER, width=2)
    draw_badge(draw, (112, 1218), "取舍说明", ACCENT_ORANGE)
    draw_block_text(draw, (290, 1210), note, 50, font_size=24, fill=TEXT)

    image.save(OUTPUT_DIR / "storage_relation_diagram.png")


def generate_algorithm_flow() -> None:
    image, draw = new_canvas()
    draw_title(
        draw,
        "关键技术流程图",
        "系统不是简单的大模型改写，而是将岗位理解、材料解析、RAG 检索、结构化生成、ATS 评分与流式反馈串成完整闭环。",
    )

    steps = [
        ("01", "信息输入", "填写目标岗位、JD、个人资料或上传原简历"),
        ("02", "材料解析", "FileService 解析 PDF / PPTX，提取可复用经历与附件上下文"),
        ("03", "岗位理解", "JobSearchService 联网检索岗位情报，补充企业和职责语境"),
        ("04", "知识增强", "RagService 检索参考简历，注入行业表达方式和案例范式"),
        ("05", "追问与生成", "ProfileMemory 检测缺口，ResumeAIEngine 生成结构化简历"),
        ("06", "语义评分", "SemanticATSService 计算关键词覆盖、语义相似度与综合分"),
        ("07", "结果落地", "SSE 回写工作台，支持手动改写、快照保存和导出"),
    ]

    base_y = 260
    box_w = 260
    box_h = 170
    gap = 36
    for idx, (step_no, step_title, step_body) in enumerate(steps):
        x = 90 + idx * (box_w + gap)
        fill = CARD if idx % 2 == 0 else "#F9FBFF"
        accent = [ACCENT, ACCENT_GREEN, ACCENT_ORANGE][idx % 3]
        draw.rounded_rectangle((x, base_y, x + box_w, base_y + box_h), radius=28, fill=fill, outline=BORDER, width=2)
        draw.rounded_rectangle((x + 22, base_y + 20, x + 86, base_y + 68), radius=18, fill=accent)
        draw.text((x + 36, base_y + 30), step_no, fill="#FFFFFF", font=font(22, True))
        draw.text((x + 22, base_y + 86), step_title, fill=TEXT, font=font(28, True))
        draw_block_text(draw, (x + 22, base_y + 124), step_body, 10, font_size=18, fill=MUTED, line_gap=8)
        if idx < len(steps) - 1:
            draw_arrow(draw, (x + box_w, base_y + box_h // 2), (x + box_w + gap - 6, base_y + box_h // 2))

    left_box = (120, 580, 1040, 1230)
    right_box = (1160, 580, 2080, 1230)
    draw.rounded_rectangle(left_box, radius=28, fill=CARD, outline=BORDER, width=2)
    draw.rounded_rectangle(right_box, radius=28, fill=CARD, outline=BORDER, width=2)
    draw_badge(draw, (148, 608), "关键难点", ACCENT)
    draw_badge(draw, (1188, 608), "技术亮点", ACCENT_GREEN)

    left_points = [
        "非结构化材料解析：用户上传的 PDF/PPTX 内容质量不一，需要先做文本提取与上下文整理。",
        "岗位约束不稳定：不同 JD 的表达方式差异大，仅用关键词匹配容易失真。",
        "生成结果可用性：通用大模型输出格式不稳定，直接落地到前端编辑器容易出错。",
        "用户等待焦虑：传统整包返回模式响应慢，用户难以判断系统是否仍在工作。",
    ]
    right_points = [
        "ProfileMemory 先追问后生成，减少“信息不全却强行编写”的无效输出。",
        "RAG + 岗位情报双增强，同时考虑参考简历表达和实时岗位语境。",
        "Pydantic / 结构化契约保证输出可解析、可编辑、可评分。",
        "SSE 流式回写让工作台实时刷新，便于展示 AI 处理进度与阶段结果。",
        "ATS 评分模块把生成质量转成可量化指标，便于后续修订与对比测试。",
    ]

    current_y = 680
    for point in left_points:
        draw.rounded_rectangle((148, current_y, 1012, current_y + 118), radius=22, fill="#F9FBFF", outline=BORDER, width=2)
        draw.text((176, current_y + 22), "•", fill=ACCENT, font=font(36, True))
        draw_block_text(draw, (214, current_y + 20), point, 34, font_size=24, fill=TEXT, line_gap=8)
        current_y += 138

    current_y = 680
    for point in right_points:
        draw.rounded_rectangle((1188, current_y, 2052, current_y + 104), radius=22, fill="#F9FBFF", outline=BORDER, width=2)
        draw.text((1216, current_y + 18), "•", fill=ACCENT_GREEN, font=font(34, True))
        draw_block_text(draw, (1254, current_y + 18), point, 34, font_size=23, fill=TEXT, line_gap=8)
        current_y += 124

    image.save(OUTPUT_DIR / "algorithm_flow.png")


def generate_usage_flow() -> None:
    image, draw = new_canvas()
    draw_title(
        draw,
        "典型使用流程图",
        "界面设计采用“工作台 + 编辑页”双空间：编辑页负责录入素材，工作台负责查看进度、ATS 评分、草稿修订和版本管理。",
    )

    steps = [
        ("进入编辑页", "填写目标公司、岗位名称和 JD"),
        ("录入候选素材", "补充技能、教育、项目和工作经历"),
        ("上传附件", "支持 PDF / PPTX / 原始简历文件"),
        ("启动生成/优化", "返回工作台后点击主按钮开始执行"),
        ("查看实时结果", "右侧进度塔与草稿实验台实时刷新"),
        ("保存与导出", "保存快照、恢复历史或导出 MD / TXT"),
    ]

    x_positions = [120, 455, 790, 1125, 1460, 1795]
    y = 520
    for idx, ((title_text, body_text), x) in enumerate(zip(steps, x_positions)):
        accent = [ACCENT, ACCENT_GREEN, ACCENT_ORANGE][idx % 3]
        draw.rounded_rectangle((x, y, x + 285, y + 250), radius=28, fill=CARD, outline=BORDER, width=2)
        draw.rounded_rectangle((x + 24, y + 22, x + 90, y + 76), radius=18, fill=accent)
        draw.text((x + 42, y + 34), f"{idx + 1}", fill="#FFFFFF", font=font(24, True))
        draw.text((x + 24, y + 102), title_text, fill=TEXT, font=font(28, True))
        draw_block_text(draw, (x + 24, y + 150), body_text, 11, font_size=20, fill=MUTED)
        if idx < len(steps) - 1:
            draw_arrow(draw, (x + 285, y + 125), (x_positions[idx + 1] - 18, y + 125), color=accent)

    lower_note = (
        "该流程同时适用于“新建简历”和“现有简历优化”两种模式。差异在于：前者直接从候选人资料生成草稿，后者先导入原简历，再围绕岗位要求定向重写。"
    )
    draw.rounded_rectangle((120, 970, W - 120, 1190), radius=26, fill=ACCENT_SOFT, outline=BORDER, width=2)
    draw_badge(draw, (150, 1010), "界面说明", ACCENT)
    draw_block_text(draw, (320, 1010), lower_note, 75, font_size=24, fill=TEXT)

    image.save(OUTPUT_DIR / "usage_flow.png")


def generate_markdown() -> None:
    content = """# 详细设计（可直接复制）

## 1. 界面设计
系统界面采用“左侧导航 + 中部工作台/编辑页 + 右侧 AI 控制塔/草稿实验台”的布局方式，目的不是单纯展示简历结果，而是把录入、生成、评分、修订和版本管理放到同一工作流中。左侧区域负责模式切换、账户状态和模型状态；中部区域负责工作台预览或资料录入；右侧区域负责 AI 执行进度、岗位情报、改写指令和导出操作。这样的设计使用户既能看到当前生成结果，也能实时感知系统处理到了哪一步。

界面上分为两种工作模式：一是“新建简历”，面向从零开始填写资料的用户；二是“现有简历优化”，面向已经有旧简历、只需围绕目标岗位重写的用户。两种模式共享同一套工作台，但在编辑页中分别提供不同的信息录入结构，降低无关输入对用户的干扰。工作台则集中展示 ATS 仪表盘、结构化简历预览、AI 进度时间线和草稿实验台，便于用户形成“录入-生成-修订-导出”的闭环。

建议配图：
1. `ui_01_workbench_overview.png`：工作台总览
2. `ui_02_greenfield_edit.png`：新建简历编辑页
3. `ui_03_existing_resume_workbench.png`：现有简历优化工作台
4. `ui_04_existing_resume_edit.png`：现有简历优化编辑页
5. `ui_05_history_and_versions.png`：历史记录与版本管理

## 2. 本地存储设计（无独立数据库）
本作品当前没有采用独立数据库，而是使用 `memory.json`、`profile_memory.json` 与本地上传目录构成轻量持久化层。这样设计的原因是：作品定位为可本地运行的原型系统，评审时更强调“开箱即用、部署简单、状态可恢复”，因此优先采用低门槛方案。虽然这不符合严格的数据库范式设计，但能够显著降低部署复杂度，也更适合单用户演示场景。

其中，`memory.json` 主要保存工作区草稿、上传记录、历史快照、导出记录和模块状态；`profile_memory.json` 主要保存压缩后的用户画像和事实约束，用于追问生成与多轮上下文复用；`backend/uploads/` 保存用户上传的 PDF、PPTX 或原始简历文件；参考简历库则以本地 JSON / ChromaDB 的形式提供给 RAG 检索服务。当前方案在工程上做了“轻量优先”的取舍，后续如果扩展为多用户版本，可按服务边界迁移至 MySQL 或 PostgreSQL。

建议配图：
1. `storage_design_table.png`：本地存储设计表
2. `storage_relation_diagram.png`：持久化关系图

## 3. 关键技术与算法设计
本系统的核心并不是简单调用大模型，而是把岗位理解、材料解析、知识增强、结构化生成、语义评分和流式反馈串成完整链路。首先，系统接收用户填写的目标岗位、JD、个人经历和附件材料；随后通过文件服务提取 PDF/PPTX 文本内容，并通过岗位检索服务补充岗位上下文。之后，RAG 服务从参考简历库中检索相似案例，为生成阶段注入更贴近求职场景的表达方式和结构模式。

在生成阶段，ProfileMemory 会先检测信息缺口并提出追问，避免在信息不足时盲目生成；ResumeAIEngine 在获得足够信息后，按照结构化契约输出简历草稿，确保结果可解析、可编辑、可评分；SemanticATSService 再从关键词覆盖、语义相似度和综合匹配度三个维度进行打分，把原本“只看感觉”的简历质量转化为可量化指标。最后，系统通过 SSE 将执行进度、阶段状态和生成结果实时回写到工作台，使用户能够边看边改，显著改善等待体验。

建议配图：
1. `algorithm_flow.png`：关键技术流程图
2. `usage_flow.png`：典型使用流程图

## 4. 设计特点总结
本系统的详细设计强调三点：一是界面上做到“录入空间”和“工作空间”分离，减少操作干扰；二是在数据层采用轻量本地持久化，保证评审现场可运行、可恢复；三是在算法层将 RAG、ProfileMemory、结构化生成、ATS 评分与 SSE 流式反馈组合为完整闭环。相比只做模板排版或只做文本生成的方案，本作品更强调可解释性、可编辑性和可量化评估能力。
"""
    (OUTPUT_DIR / "detailed_design_copy.md").write_text(content, encoding="utf-8")


def generate_index() -> None:
    lines = [
        "详细设计素材清单",
        "",
        "界面截图：",
        "1. ui_01_workbench_overview.png",
        "2. ui_02_greenfield_edit.png",
        "3. ui_03_existing_resume_workbench.png",
        "4. ui_04_existing_resume_edit.png",
        "5. ui_05_history_and_versions.png",
        "",
        "图表素材：",
        "6. storage_design_table.png",
        "7. storage_relation_diagram.png",
        "8. algorithm_flow.png",
        "9. usage_flow.png",
        "",
        "正文：",
        "10. detailed_design_copy.md",
    ]
    (OUTPUT_DIR / "README.txt").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    ensure_output_dir()
    generate_storage_table()
    generate_storage_relation()
    generate_algorithm_flow()
    generate_usage_flow()
    generate_markdown()
    generate_index()


if __name__ == "__main__":
    main()
