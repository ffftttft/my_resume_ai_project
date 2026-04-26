# 评委验证说明

本项目支持两种运行方式：

- 发布包模式：若收到的是已打包发布目录，则可直接双击 `start_local.bat` 验证完整流程。
- 源码模式：若仅收到源码仓库且未包含本地 `.env`，则系统会自动进入本地兜底模式。

## 1. 默认演示模式

直接双击根目录 `start_local.bat`，或运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start_local.ps1
```

在未配置 `backend/.env` 中的 `OPENAI_API_KEY` 时，系统会自动进入本地兜底演示模式，以下流程仍可完整验证：

- 新建简历信息录入
- AI 追问补充流程
- 简历初稿生成
- 手动改写与再次优化
- 简历导出
- 历史记录与快照恢复
- 本地 RAG 检索
- ATS 基础评分

前端左侧会明确显示“本地演示 / 本地可用”，这表示当前是安全可运行的评审模式，不代表系统异常。

## 2. 如需验证实时 AI

不要把真实密钥写进仓库、源码或提交记录。请只在本机 `backend/.env` 中填写受限临时密钥，例如：

```env
OPENAI_API_KEY=your_temporary_demo_key
OPENAI_MODEL=gpt-5.4-mini
```

建议：

- 使用单独的演示项目或子账号密钥
- 设置低额度或短期有效期
- 仅在答辩机器本地保存，不随作品包上传

## 3. 联网岗位搜索说明

如需验证联网岗位搜索，请额外在 `backend/.env` 中配置：

```env
TAVILY_API_KEY=your_temporary_demo_key
```

未配置时，其余核心简历生成与编辑流程不受影响。
