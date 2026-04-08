# My Resume AI Project

本项目是一个本地可运行的 AI 个性化简历生成系统原型，适合先在电脑上完成交互验证，后续再扩展为数据库版本、正式网页或 App。

## 功能概览

- 左侧展示简历结果，支持实时预览和手动修改
- 右侧填写基本信息、教育、技能、项目/实习经历
- 支持上传 `PDF / PPT / PPTX` 辅助材料
- 支持勾选生成模块
- 支持普通/高级用户模式切换
- 信息不足时，AI 会先追问，再更新简历
- 所有关键生成、上传、导出动作都会更新根目录的 `memory.json`
- 没有 `OPENAI_API_KEY` 时会自动启用本地兜底逻辑，方便本地测试流程

## 项目结构

```text
my_resume_ai_project/
├─ frontend/          # React + Vite + Tailwind 前端
├─ backend/           # FastAPI 后端
├─ ai_modules/        # AI 调用和本地兜底逻辑
├─ memory.json        # 本地永久记忆
└─ README.md          # 使用说明
```

## 运行方式

### 一键启动

如果你不想手动输命令，直接双击项目根目录下的：

```text
start_local.bat
```

它会自动完成这些事情：

- 自动补齐 `backend/.env` 和 `frontend/.env`
- 如果缺少依赖，自动安装后端和前端依赖
- 自动启动后端窗口和前端窗口
- 自动打开浏览器到 `http://localhost:5173`
- 如果没有 `OPENAI_API_KEY`，自动使用本地兜底模式

### 1. 启动后端

在项目根目录执行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
python backend\run_local.py
```

后端默认地址：

```text
http://127.0.0.1:8000
```

### 2. 启动前端

另开一个终端，在项目根目录执行：

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

前端默认地址：

```text
http://localhost:5173
```

### 3. 只做环境准备

如果你只想先安装依赖、不立刻打开窗口，可以运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start_local.ps1 -PrepareOnly
```

## OpenAI 配置

如需启用真实 AI，请在 `backend/.env` 中配置：

```env
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5.4-mini
```

说明：

- `OPENAI_MODEL` 默认使用 `gpt-5.4-mini`
- 如果没有配置 `OPENAI_API_KEY`，后端会自动切换为本地规则引擎
- 本地规则引擎不会联网，但会完整跑通“追问 -> 生成 -> 修改 -> 导出”的流程

## 文件上传说明

- `PDF` 会尝试用 `pypdf` 提取文本
- `PPTX` 会尝试用 `python-pptx` 提取文本
- `PPT` 旧格式目前仅保留文件元数据，代码里已标注 `TODO`

## 记忆机制

`memory.json` 会记录以下内容：

- 已生成的项目模块
- 后端启动时间
- 已上传文件
- 已生成的简历模块
- 已导出的文件
- 最近一次简历快照

启动后端时会自动读取 `memory.json`，并把已有历史展示给前端。

## API 简例

### 生成简历

```http
POST /api/resume/generate
Content-Type: application/json
```

```json
{
  "profile": {
    "basic_info": {
      "name": "张三",
      "target_role": "后端开发实习生"
    },
    "skills": ["Python", "FastAPI", "MySQL"],
    "education": [],
    "experiences": [],
    "projects": [],
    "modules": ["summary", "skills", "education"],
    "membership_level": "basic",
    "use_full_information": false,
    "uploaded_context": ""
  }
}
```

## 后续可扩展方向

- `TODO`: 接入数据库保存多份简历版本
- `TODO`: 增加 PDF 模板导出
- `TODO`: 增加登录、角色权限和多用户隔离
- `TODO`: 增加 App/Web 正式部署方案
