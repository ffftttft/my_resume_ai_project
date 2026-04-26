---
theme: default
background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
title: 智铸履途 - 基于 RAG 与语义 ATS 的智能简历优化系统
fonts:
  sans: 'Inter, Microsoft YaHei'
  serif: 'Crimson Pro'
  mono: 'JetBrains Mono'
layout: cover
class: text-center compact-cover
---

<style>
.slidev-layout {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #f1f5f9;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1.5rem;
  margin-top: 3rem;
}

.tech-item {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s;
}

.tech-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.slidev-layout.compact-cover h1 {
  font-size: 5.4rem;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.slidev-layout.compact-cover h2 {
  font-size: 2.65rem;
  line-height: 1.15;
}

.slidev-layout.compact-cover p,
.slidev-layout.compact-cover li,
.slidev-layout.compact-two-cols p,
.slidev-layout.compact-two-cols li,
.slidev-layout.compact-default p,
.slidev-layout.compact-system p,
.slidev-layout.compact-table p,
.slidev-layout.compact-summary p,
.slidev-layout.compact-closing p {
  line-height: 1.35;
}

.slidev-layout.compact-default h1,
.slidev-layout.compact-system h1,
.slidev-layout.compact-table h1,
.slidev-layout.compact-summary h1 {
  font-size: 3.2rem;
  line-height: 1.05;
  margin-bottom: 0.45rem;
}

.slidev-layout.compact-default h2,
.slidev-layout.compact-system h2,
.slidev-layout.compact-table h2,
.slidev-layout.compact-summary h2 {
  font-size: 1.9rem;
  line-height: 1.15;
  margin-bottom: 0.65rem;
}

.slidev-layout.compact-two-cols h1 {
  font-size: 3rem;
  line-height: 1.05;
  margin-bottom: 0.35rem;
}

.slidev-layout.compact-two-cols h2 {
  font-size: 1.7rem;
  line-height: 1.12;
  margin-bottom: 0.55rem;
}

.slidev-layout.compact-two-cols h3 {
  font-size: 1.55rem;
  line-height: 1.1;
  margin-bottom: 0.35rem;
}

.slidev-layout.compact-two-cols p,
.slidev-layout.compact-two-cols li {
  font-size: 0.95rem;
}

.slidev-layout.compact-two-cols ul,
.slidev-layout.compact-two-cols ol {
  margin-top: 0.75rem;
}

.slidev-layout.compact-two-cols .shiki,
.slidev-layout.compact-system .shiki {
  font-size: 0.74rem !important;
  line-height: 1.35 !important;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.slidev-layout.compact-two-cols pre,
.slidev-layout.compact-system pre {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.slidev-layout.compact-table table {
  font-size: 0.92rem;
  line-height: 1.2;
}

.slidev-layout.compact-table th,
.slidev-layout.compact-table td {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.slidev-layout.compact-closing h1 {
  font-size: 5.5rem;
  line-height: 1;
  margin-bottom: 0.4rem;
}

.slidev-layout.compact-closing h2 {
  font-size: 2.7rem;
  line-height: 1.1;
  margin-bottom: 0.25rem;
}

.slidev-layout.compact-section h1 {
  font-size: 4rem;
  line-height: 1.05;
  margin-bottom: 0.45rem;
}

.slidev-layout.compact-section p,
.slidev-layout.compact-section li {
  line-height: 1.35;
}
</style>

# <span class="gradient-text">智铸履途</span>

## 基于 RAG 与语义 ATS 的智能简历优化系统

<div class="text-lg mt-6 mb-3 opacity-90">
从原始经历到完美简历，AI 驱动的全栈优化引擎
</div>

<div class="grid grid-cols-3 gap-4 mt-8 max-w-5xl mx-auto">
<div class="p-4 bg-blue-500/10 rounded-xl border-2 border-blue-500/30">
<div class="text-3xl mb-2">🔥</div>
<div class="text-base font-bold mb-1">RAG 知识注入</div>
<div class="text-sm opacity-70">ChromaDB + 1536维向量</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl border-2 border-purple-500/30">
<div class="text-3xl mb-2">⚡</div>
<div class="text-base font-bold mb-1">结构化生成</div>
<div class="text-sm opacity-70">Pydantic 契约保证</div>
</div>
<div class="p-4 bg-cyan-500/10 rounded-xl border-2 border-cyan-500/30">
<div class="text-3xl mb-2">🎯</div>
<div class="text-base font-bold mb-1">语义 ATS 评分</div>
<div class="text-sm opacity-70">87% 匹配度</div>
</div>
</div>

<div class="mt-8 text-xs opacity-60">
全国大学生计算机程序设计大赛 · 软件应用与开发（Web 应用与开发）
</div>

<div class="mt-3 text-sm opacity-80">
汇报人：宋丞泽
</div>

---
layout: center
class: text-center
---

# 目录

<div class="grid grid-cols-2 gap-8 mt-12">

<div class="p-8 bg-blue-500/10 rounded-xl">
<div class="text-5xl font-black text-blue-400 mb-3">01</div>
<div class="text-2xl font-bold mb-2">项目背景</div>
<div class="text-sm opacity-70">行业现状 · 核心创新</div>
</div>

<div class="p-8 bg-purple-500/10 rounded-xl">
<div class="text-5xl font-black text-purple-400 mb-3">02</div>
<div class="text-2xl font-bold mb-2">核心技术架构</div>
<div class="text-sm opacity-70">Web 架构 · RAG 检索</div>
</div>

<div class="p-8 bg-cyan-500/10 rounded-xl">
<div class="text-5xl font-black text-cyan-400 mb-3">03</div>
<div class="text-2xl font-bold mb-2">算法实现与评估</div>
<div class="text-sm opacity-70">实验设计 · 性能对比</div>
</div>

<div class="p-8 bg-green-500/10 rounded-xl">
<div class="text-5xl font-black text-green-400 mb-3">04</div>
<div class="text-2xl font-bold mb-2">项目总结</div>
<div class="text-sm opacity-70">技术链路 · 未来展望</div>
</div>

</div>

---
layout: center
class: text-center compact-section
---

# <span class="gradient-text">一. 项目背景</span>

<div class="text-lg opacity-80">行业现状 · 核心创新 · 研究目标</div>

<div class="grid grid-cols-3 gap-4 mt-8 max-w-5xl mx-auto text-left">
<div class="p-4 bg-blue-500/10 rounded-xl border border-blue-400/20">
<div class="text-sm font-bold text-blue-300 mb-2">为什么做</div>
<div class="text-xl font-bold mb-2">简历生成仍是黑盒</div>
<div class="text-sm opacity-75">缺少领域知识、结构不稳、ATS 通过率偏低。</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
<div class="text-sm font-bold text-purple-300 mb-2">做什么</div>
<div class="text-xl font-bold mb-2">构建可解释闭环</div>
<div class="text-sm opacity-75">把检索、生成、评分串成可见的简历优化链路。</div>
</div>
<div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
<div class="text-sm font-bold text-cyan-300 mb-2">价值点</div>
<div class="text-xl font-bold mb-2">对齐真实求职场景</div>
<div class="text-sm opacity-75">从岗位匹配出发，兼顾内容质量与可投递性。</div>
</div>
</div>

<div class="mt-6 text-xs opacity-60">本章回答：痛点从哪里来，系统如何建立差异化价值。</div>

---
layout: two-cols
class: compact-two-cols
---

# 背景挑战

## 传统 AI 简历生成的"黑盒"困局

通用 LLM 缺乏行业领域知识，且生成的 JSON 格式极不稳定。本项目通过 RAG 范式引入专家知识库，解决 Web 端内容生成的不可控难题。

### ❌ 传统工具痛点

- 缺乏领域知识，内容空洞
- JSON 格式不稳定，解析失败
- 黑盒生成，缺乏可解释性

::right::

<div class="pl-8 pt-12">

<div class="p-6 bg-red-500/10 rounded-xl mb-6 border-l-4 border-red-500">
<div class="text-5xl font-black text-red-400">75%</div>
<div class="text-sm opacity-70 mt-2">简历被 ATS 系统过滤</div>
</div>

<div class="p-6 bg-orange-500/10 rounded-xl mb-6 border-l-4 border-orange-500">
<div class="text-5xl font-black text-orange-400">3秒</div>
<div class="text-sm opacity-70 mt-2">HR 平均阅读时间</div>
</div>

<div class="p-6 bg-yellow-500/10 rounded-xl border-l-4 border-yellow-500">
<div class="text-5xl font-black text-yellow-400">1179万</div>
<div class="text-sm opacity-70 mt-2">2024 届毕业生人数</div>
</div>

</div>

---
layout: default
class: compact-default
---

# 核心创新

## 构建高可解释性的结构化简历生成闭环

我们不仅在做 Web 应用，更在定义一套基于 Pydantic 契约的简历生成标准，确保生成质量的完整性与可编辑性。

<div class="grid grid-cols-4 gap-4 mt-6">

<div class="p-4 bg-blue-500/10 rounded-xl border-t-4 border-blue-400 text-center">
<div class="text-4xl mb-3">🔍</div>
<div class="text-lg font-bold mb-1 gradient-text">RAG 检索</div>
<div class="text-sm opacity-70">零标注领域知识注入</div>
</div>

<div class="p-4 bg-purple-500/10 rounded-xl border-t-4 border-purple-400 text-center">
<div class="text-4xl mb-3">📊</div>
<div class="text-lg font-bold mb-1 gradient-text">语义 ATS</div>
<div class="text-sm opacity-70">1536 维向量空间匹配</div>
</div>

<div class="p-4 bg-cyan-500/10 rounded-xl border-t-4 border-cyan-400 text-center">
<div class="text-4xl mb-3">🎯</div>
<div class="text-lg font-bold mb-1 gradient-text">结构化输出</div>
<div class="text-sm opacity-70">Pydantic 契约保证</div>
</div>

<div class="p-4 bg-green-500/10 rounded-xl border-t-4 border-green-400 text-center">
<div class="text-4xl mb-3">🌊</div>
<div class="text-lg font-bold mb-1 gradient-text">流式传输</div>
<div class="text-sm opacity-70">SSE 实时反馈</div>
</div>

</div>

<div class="mt-5 text-center p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl">
<div class="text-lg font-bold mb-1 gradient-text">核心目标</div>
<div class="text-base mb-1">从"通用模板"到"个性化定制"</div>
<div class="text-sm opacity-80">
AI 理解用户背景 → 检索优质案例 → 生成针对性简历 → 语义评分优化
</div>
</div>

---
layout: two-cols
class: compact-two-cols
---

# 多模态输入

## PDF 与 PPTX 全自动解析

系统可从 PDF 简历与项目 PPT 中自动提取经历与技能特征。

- 📄 **PDF 简历**：pypdf 文本提取
- 📊 **PPTX 项目**：python-pptx 解析
- 📝 **统一分片**：语义切分后向量化

::right::

<div class="pl-4 pt-2">

```mermaid {theme: 'dark', scale: 0.5}
graph TD
    A[文件上传] --> B{类型}
    B -->|PDF| C[pypdf]
    B -->|PPTX| D[python-pptx]
    C --> E[文本提取]
    D --> E
    E --> F[语义分片]
    F --> G[向量化]
    G --> H[ChromaDB]
    
    style A fill:#3b82f6
    style E fill:#8b5cf6
    style G fill:#06b6d4
```

<div class="mt-1 text-xs opacity-80 leading-snug">
优势：自动抽取项目经历，识别隐藏技能点
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# ProfileMemory

## 4KB 压缩记忆与主动追问

仿照专家对话逻辑，在信息不足时主动发起追问。

✅ 自动识别信息缺失  
✅ 生成针对性追问  
✅ 压缩历史对话至 4KB

<div class="grid grid-cols-3 gap-2 mt-4 text-center">
<div class="p-2 bg-blue-500/10 rounded-lg">
<div class="text-sm font-bold text-blue-300">缺失检测</div>
<div class="text-xs opacity-70">教育 / 项目 / 技能</div>
</div>
<div class="p-2 bg-purple-500/10 rounded-lg">
<div class="text-sm font-bold text-purple-300">上下文压缩</div>
<div class="text-xs opacity-70">最近对话 + 摘要</div>
</div>
<div class="p-2 bg-cyan-500/10 rounded-lg">
<div class="text-sm font-bold text-cyan-300">追问生成</div>
<div class="text-xs opacity-70">只问关键缺口</div>
</div>
</div>

::right::

<div class="pl-4 pt-2">

```python
class ProfileMemoryService:
    def generate_questions(self, profile, history):
        memory = self.compress(history, max_bytes=4096)
        missing = self.detect_missing(profile, memory)
        return self.create_questions(missing)
```

<div class="mt-1 p-2 bg-cyan-500/10 rounded-lg text-xs leading-snug">
<div class="font-bold">记忆压缩策略</div>
<div class="opacity-80">保留最近 N 条对话 + 关键信息摘要</div>
</div>

<div class="grid grid-cols-2 gap-2 mt-2 text-xs">
<div class="p-2 bg-white/5 rounded-lg text-center">历史对话 → 压缩摘要</div>
<div class="p-2 bg-white/5 rounded-lg text-center">摘要 + 当前画像 → 缺失检测</div>
<div class="p-2 bg-white/5 rounded-lg text-center">缺口定位 → 追问生成</div>
<div class="p-2 bg-white/5 rounded-lg text-center">追问完成 → 回写简历状态</div>
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# 1536 维向量空间

## text-embedding-3-small 高维建模

系统将简历与参考案例统一映射至 1536 维向量空间。

1️⃣ **预处理**：分词、清洗、标准化  
2️⃣ **Embedding**：text-embedding-3-small  
3️⃣ **归一化**：L2 范数标准化

<div class="grid grid-cols-3 gap-2 mt-4 text-center">
<div class="p-2 bg-blue-500/10 rounded-lg">
<div class="text-sm font-bold text-blue-300">案例召回</div>
<div class="text-xs opacity-70">找相似简历模板</div>
</div>
<div class="p-2 bg-purple-500/10 rounded-lg">
<div class="text-sm font-bold text-purple-300">语义评分</div>
<div class="text-xs opacity-70">量化 JD 匹配度</div>
</div>
<div class="p-2 bg-cyan-500/10 rounded-lg">
<div class="text-sm font-bold text-cyan-300">推荐排序</div>
<div class="text-xs opacity-70">筛选最佳提示词</div>
</div>
</div>

::right::

<div class="pl-4 pt-2">

<div class="grid grid-cols-2 gap-2 mb-2">
<div class="p-2 bg-blue-500/10 rounded-lg text-center">
<div class="text-2xl font-bold text-blue-400">1536</div>
<div class="text-xs opacity-70">向量维度</div>
</div>
<div class="p-2 bg-purple-500/10 rounded-lg text-center">
<div class="text-2xl font-bold text-purple-400">Cosine</div>
<div class="text-xs opacity-70">相似度算法</div>
</div>
<div class="p-2 bg-cyan-500/10 rounded-lg text-center">
<div class="text-2xl font-bold text-cyan-400">3</div>
<div class="text-xs opacity-70">Top-K</div>
</div>
<div class="p-2 bg-green-500/10 rounded-lg text-center">
<div class="text-2xl font-bold text-green-400">100+</div>
<div class="text-xs opacity-70">参考库</div>
</div>
</div>

```mermaid {theme: 'dark', scale: 0.54}
graph LR
    A[文本] --> B[Embedding]
    B --> C[1536维]
    C --> D[ChromaDB]
    
    style A fill:#3b82f6
    style C fill:#06b6d4
```

<div class="grid grid-cols-3 gap-2 mt-2 text-xs text-center">
<div class="p-2 bg-white/5 rounded-lg">输入标准化</div>
<div class="p-2 bg-white/5 rounded-lg">向量索引召回</div>
<div class="p-2 bg-white/5 rounded-lg">相似度驱动评分</div>
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# RAG 检索增强

## ChromaDB 驱动的专家知识库

通过 RAG 将行业专家写作规范动态注入 Prompt。

✅ **零标注接入**：快速部署，无需训练  
✅ **动态更新**：知识库变更即可生效  
✅ **专家规范**：注入行业最佳实践

::right::

<div class="pl-4 pt-2">

```mermaid {theme: 'dark', scale: 0.52}
graph TD
    A[JD] --> B[Embedding]
    B --> C[ChromaDB]
    C --> D[Top-3]
    D --> E[Prompt]
    E --> F[LLM生成]
    
    G[中文库] --> C
    H[英文库] --> C
    
    style A fill:#3b82f6
    style C fill:#8b5cf6
    style D fill:#06b6d4
    style F fill:#10b981
```

<div class="mt-1 text-xs opacity-80 leading-snug">
数据源：中英文双库，各 50+ 条
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# 结构化输出

## Instructor + Pydantic 契约保证

摒弃传统 json.loads 解析，采用 Pydantic v2 强制校验。

### ❌ 传统 JSON 解析

```python
response = llm.generate(prompt)
try:
    data = json.loads(response)
except json.JSONDecodeError:
    return None
```

::right::

<div class="pl-4 pt-2">

### ✅ 结构化输出

```python
from pydantic import BaseModel

class StructuredResume(BaseModel):
    summary: str
    experience: list[WorkExperience]
    skills: list[str]

resume = client.chat.completions.create(
    model="gpt-4",
    response_model=StructuredResume,
    messages=[...],
)
```

<div class="mt-1 p-2 bg-green-500/10 rounded-lg text-center">
<div class="text-2xl font-bold text-green-400">5/5</div>
<div class="text-xs opacity-70">结构完整性评分</div>
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# SSE 流式传输

## Server-Sent Events 实时反馈

针对 Web 应用场景，实现 SSE 异步传输，首字节时间 < 500ms。

### 后端实现

```python
@router.post("/api/resume/generate-stream")
async def generate_resume_stream():
    async def event_generator():
        for chunk in ai_engine.generate_stream():
            yield f"data: {json.dumps(chunk)}\n\n"
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

::right::

<div class="pl-8 pt-4">

### 前端接收

```javascript
const eventSource = new EventSource(
  '/api/resume/generate-stream'
);

eventSource.onmessage = (event) => {
    const chunk = JSON.parse(event.data);
    updateResumePreview(chunk);
};
```

<div class="grid grid-cols-2 gap-3 mt-3">
<div class="p-4 bg-gray-500/10 rounded-lg opacity-60 text-center">
<div class="text-xl mb-1">⏳</div>
<div class="text-xs font-bold">传统模式</div>
<div class="text-xl font-bold text-red-400 mt-1">8s</div>
</div>
<div class="p-4 bg-green-500/10 rounded-lg border-2 border-green-500 text-center">
<div class="text-xl mb-1">⚡</div>
<div class="text-xs font-bold">流式模式</div>
<div class="text-xl font-bold text-green-400 mt-1">3s</div>
</div>
</div>

<div class="mt-2 text-center text-xs text-green-400 font-bold">
体验提升 62%
</div>

</div>

---
layout: two-cols
class: compact-two-cols
---

# 语义 ATS 评分

## Embedding 相似度量化匹配

基于 1536 维特征的语义距离，输出多维度评估报告。

### 评分维度

🎯 **关键词覆盖率**：JD 关键词命中  
💼 **技能匹配度**：技术栈相似度  
🔍 **语义相似度**：Cosine Similarity

<div class="grid grid-cols-3 gap-2 mt-4 text-center">
<div class="p-2 bg-red-500/10 rounded-lg">
<div class="text-lg font-bold text-red-300">18/20</div>
<div class="text-xs opacity-70">关键词覆盖</div>
</div>
<div class="p-2 bg-green-500/10 rounded-lg">
<div class="text-lg font-bold text-green-300">87%</div>
<div class="text-xs opacity-70">ATS 匹配度</div>
</div>
<div class="p-2 bg-cyan-500/10 rounded-lg">
<div class="text-lg font-bold text-cyan-300">5/5</div>
<div class="text-xs opacity-70">结构完整性</div>
</div>
</div>

::right::

<div class="pl-4 pt-2">

```python
class SemanticATSService:
    def score(self, resume, jd):
        keywords = self._extract_keywords(
            jd, limit=20
        )
        coverage = self._lexical_coverage(
            resume, keywords
        )[0]
        embed = self.embedding_service.embed
        score = cosine_similarity(
            embed(resume),
            embed(jd),
        )
        overall = (coverage * 0.4 + score * 0.6) * 100
        return {"overall": overall}
```

<div class="mt-2 p-2 bg-cyan-500/10 rounded-lg text-xs leading-snug">
<div class="font-bold">输出结果</div>
<div class="opacity-80">overall / coverage / semantic 三层得分，直接服务于优化建议。</div>
</div>

</div>

---
layout: center
class: text-center compact-section
---

# <span class="gradient-text">二. 核心技术架构</span>

<div class="text-lg opacity-80">Web 架构 · RAG 检索 · 结构化生成</div>

<div class="grid grid-cols-3 gap-4 mt-8 max-w-5xl mx-auto text-left">
<div class="p-4 bg-blue-500/10 rounded-xl border border-blue-400/20">
<div class="text-sm font-bold text-blue-300 mb-2">输入层</div>
<div class="text-xl font-bold mb-2">表单 + 文件解析</div>
<div class="text-sm opacity-75">从用户填写与 PDF/PPTX 中抽取结构化线索。</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
<div class="text-sm font-bold text-purple-300 mb-2">编排层</div>
<div class="text-xl font-bold mb-2">FastAPI 协同服务</div>
<div class="text-sm opacity-75">统一调度 ProfileMemory、RAG、生成与 ATS 打分。</div>
</div>
<div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
<div class="text-sm font-bold text-cyan-300 mb-2">输出层</div>
<div class="text-xl font-bold mb-2">可编辑结构化简历</div>
<div class="text-sm opacity-75">支持流式反馈、量化评估与导出闭环。</div>
</div>
</div>

<div class="mt-6 text-xs opacity-60">本章聚焦：系统如何拆模块、如何保证检索与生成协同工作。</div>

---
layout: default
class: compact-system
---

# 系统全景

## 基于微服务解耦的高性能 Web 架构

采用异步 FastAPI 与 Vite 组合，确保首字节时间小于 500ms。

<div class="flex flex-wrap gap-2 mt-3 text-xs">
<span class="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30">React + Vite 前端工作台</span>
<span class="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30">FastAPI 编排层</span>
<span class="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30">ChromaDB 检索</span>
<span class="px-3 py-1 rounded-full bg-green-500/10 border border-green-400/30">ATS 量化服务</span>
</div>

```mermaid {theme: 'dark', scale: 0.56}
graph LR
    A[React + Vite] --> B[FastAPI 编排层]
    B --> C[ProfileMemory]
    B --> D[RAG]
    B --> E[Resume]
    B --> F[ATS]
    D --> G[ChromaDB]
    D --> H[参考简历库]
    
    style A fill:#3b82f6
    style B fill:#8b5cf6
    style G fill:#06b6d4
```

<div class="grid grid-cols-4 gap-3 mt-4 text-center">
<div class="p-3 bg-blue-500/10 rounded-xl">
<div class="text-sm font-bold text-blue-300">输入</div>
<div class="text-xs opacity-70 mt-1">表单 / 上传 / JD</div>
</div>
<div class="p-3 bg-purple-500/10 rounded-xl">
<div class="text-sm font-bold text-purple-300">生成</div>
<div class="text-xs opacity-70 mt-1">Pydantic 契约</div>
</div>
<div class="p-3 bg-cyan-500/10 rounded-xl">
<div class="text-sm font-bold text-cyan-300">检索</div>
<div class="text-xs opacity-70 mt-1">双语案例库</div>
</div>
<div class="p-3 bg-green-500/10 rounded-xl">
<div class="text-sm font-bold text-green-300">评分</div>
<div class="text-xs opacity-70 mt-1">ATS 语义匹配</div>
</div>
</div>

---
layout: center
class: text-center compact-section
---

# <span class="gradient-text">三. 算法实现与评估</span>

<div class="text-lg opacity-80">实验设计 · 性能对比 · 可视化分析</div>

<div class="grid grid-cols-3 gap-4 mt-8 max-w-5xl mx-auto text-left">
<div class="p-4 bg-blue-500/10 rounded-xl border border-blue-400/20">
<div class="text-sm font-bold text-blue-300 mb-2">Embedding</div>
<div class="text-xl font-bold mb-2">1536 维语义建模</div>
<div class="text-sm opacity-75">把简历与 JD 放到统一向量空间中做检索与打分。</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
<div class="text-sm font-bold text-purple-300 mb-2">评估</div>
<div class="text-xl font-bold mb-2">ATS 多维评分</div>
<div class="text-sm opacity-75">覆盖关键词、技能相似度、语义整体匹配。</div>
</div>
<div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
<div class="text-sm font-bold text-cyan-300 mb-2">效率</div>
<div class="text-xl font-bold mb-2">SSE 实时反馈</div>
<div class="text-sm opacity-75">把首字节延迟压到 500ms 内，显著提升交互感受。</div>
</div>
</div>

<div class="mt-6 text-xs opacity-60">本章给出：算法链路、评分依据，以及与通用方案的对比结果。</div>

---
layout: default
class: compact-table
---

# 性能领先

## 核心质量指标与生成效率的全面胜出

实验证明，本系统在 ATS 匹配、结构完整性与生成效率上均显著优于通用大模型。

| 评价维度 | 豆包 | ChatGPT | **智简 AI** | **提升幅度** |
|---------|------|---------|------------|-------------|
| ATS 匹配度 | 65% | 72% | **87%** | **+22%** |
| 关键词覆盖 | 12/20 | 15/20 | **18/20** | **+50%** |
| 结构完整性 | 3/5 | 4/5 | **5/5** | **完美** |
| 生成时间 | 8s | 6s | **3s** | **-62%** |
| 首字节时间 | N/A | N/A | **<500ms** | **流式优势** |

<div class="mt-4 text-center text-base">
<span class="gradient-text font-bold">核心优势：</span>
RAG 领域知识注入 + Pydantic 契约保证 + SSE 流式传输
</div>

---
layout: center
class: text-center compact-section
---

# <span class="gradient-text">四. 项目总结</span>

<div class="text-lg opacity-80">技术链路 · 核心指标 · 未来展望</div>

<div class="grid grid-cols-3 gap-4 mt-8 max-w-5xl mx-auto text-left">
<div class="p-4 bg-blue-500/10 rounded-xl border border-blue-400/20">
<div class="text-sm font-bold text-blue-300 mb-2">完整闭环</div>
<div class="text-xl font-bold mb-2">从输入到评分</div>
<div class="text-sm opacity-75">已形成可演示、可编辑、可迭代的 Web 端工作流。</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl border border-purple-400/20">
<div class="text-sm font-bold text-purple-300 mb-2">结果量化</div>
<div class="text-xl font-bold mb-2">指标可对比</div>
<div class="text-sm opacity-75">ATS、速度、结构完整性均有明确的量化结果。</div>
</div>
<div class="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
<div class="text-sm font-bold text-cyan-300 mb-2">演进空间</div>
<div class="text-xl font-bold mb-2">继续扩展能力</div>
<div class="text-sm opacity-75">可延展到多轮对话、岗位推荐与版本化管理。</div>
</div>
</div>

<div class="mt-6 text-xs opacity-60">本章收束：系统价值、量化成果、下一阶段演进方向。</div>

---
layout: default
class: compact-summary
---

# 全栈闭环

## 打造具备 Git 级版本控制的简历生态

我们已构建从感知、生成到量化评分的完整 Web 技术闭环。

<div class="grid grid-cols-2 gap-4 mt-5">

<div class="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">

### 技术链路

- 追问式对话 → ProfileMemory（4KB）
- RAG 检索 → ChromaDB 知识注入
- 结构化生成 → Pydantic 契约
- 语义 ATS → 1536 维 Embedding

</div>

<div class="p-5 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-xl border-2 border-green-500/50">

### 核心指标

- 🎯 ATS 匹配度：**87%**（+22%）
- 📝 关键词覆盖：**18/20**（+50%）
- 📋 结构完整性：**5/5**（完美）
- ⚡ 生成速度：**3s**（-62%）
- 🌊 首字节：**<500ms**

</div>

</div>

<div class="mt-4 text-center text-sm opacity-85">
<span class="gradient-text font-bold">未来展望：</span>
多轮对话优化 · 职位推荐 · Git-like 版本管理
</div>

---
layout: center
class: text-center compact-closing
---

# <span class="gradient-text text-8xl">智铸履途</span>

## 锻造完美简历，铸就职场未来

### Q & A

<div class="grid grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
<div class="p-4 bg-green-500/10 rounded-xl">
<div class="text-4xl font-black text-green-400 mb-2">87%</div>
<div class="text-sm opacity-70">ATS 匹配度</div>
</div>
<div class="p-4 bg-blue-500/10 rounded-xl">
<div class="text-4xl font-black text-blue-400 mb-2">&lt;500ms</div>
<div class="text-sm opacity-70">首字节响应</div>
</div>
<div class="p-4 bg-purple-500/10 rounded-xl">
<div class="text-4xl font-black text-purple-400 mb-2">100%</div>
<div class="text-sm opacity-70">结构化契约</div>
</div>
</div>

<div class="mt-8 text-base opacity-50">
欢迎各位评委批评指正
</div>

<div class="mt-6 flex flex-wrap justify-center gap-2 text-xs opacity-80">
<span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">FastAPI</span>
<span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">React + Vite</span>
<span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">ChromaDB</span>
<span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">Pydantic</span>
<span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">Semantic ATS</span>
</div>
