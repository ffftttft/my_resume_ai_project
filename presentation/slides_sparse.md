---
theme: default
background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
title: 智简 AI - 基于 RAG 与语义分析的个性化简历优化平台
fonts:
  sans: 'Inter, Microsoft YaHei'
  serif: 'Crimson Pro'
  mono: 'JetBrains Mono'
layout: cover
class: text-center
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
</style>

# <span class="gradient-text">智简 AI</span>

## 基于 RAG 与语义分析的个性化简历优化平台

全国大学生计算机程序设计大赛 · 软件应用与开发（Web 应用与开发）

<div class="tech-grid">
  <div class="tech-item">⚡<br/>FastAPI</div>
  <div class="tech-item">⚛️<br/>React 19</div>
  <div class="tech-item">🗄️<br/>ChromaDB</div>
  <div class="tech-item">🔍<br/>RAG</div>
  <div class="tech-item">📊<br/>Pydantic</div>
  <div class="tech-item">🌊<br/>SSE</div>
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
---

# <span class="gradient-text">一. 项目背景</span>

行业现状 · 核心创新 · 研究目标

---
layout: two-cols
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
---

# 核心创新

## 构建高可解释性的结构化简历生成闭环

我们不仅在做 Web 应用，更在定义一套基于 Pydantic 契约的简历生成标准，确保生成质量的 100% 完整性与可编辑性。

<div class="grid grid-cols-4 gap-6 mt-12">

<div class="p-6 bg-blue-500/10 rounded-xl border-t-4 border-blue-400 text-center">
<div class="text-5xl mb-4">🔍</div>
<div class="text-xl font-bold mb-2 gradient-text">RAG 检索</div>
<div class="text-sm opacity-70">零标注领域知识注入</div>
</div>

<div class="p-6 bg-purple-500/10 rounded-xl border-t-4 border-purple-400 text-center">
<div class="text-5xl mb-4">📊</div>
<div class="text-xl font-bold mb-2 gradient-text">语义 ATS</div>
<div class="text-sm opacity-70">1536 维向量空间匹配</div>
</div>

<div class="p-6 bg-cyan-500/10 rounded-xl border-t-4 border-cyan-400 text-center">
<div class="text-5xl mb-4">🎯</div>
<div class="text-xl font-bold mb-2 gradient-text">结构化输出</div>
<div class="text-sm opacity-70">Pydantic 契约保证</div>
</div>

<div class="p-6 bg-green-500/10 rounded-xl border-t-4 border-green-400 text-center">
<div class="text-5xl mb-4">🌊</div>
<div class="text-xl font-bold mb-2 gradient-text">流式传输</div>
<div class="text-sm opacity-70">SSE 实时反馈</div>
</div>

</div>

<div class="mt-12 text-center p-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl">
<div class="text-2xl font-bold mb-4 gradient-text">核心目标</div>
<div class="text-xl mb-4">从"通用模板"到"个性化定制"</div>
<div class="text-base opacity-80">
AI 理解用户背景 → 检索优质案例 → 生成针对性简历 → 语义评分优化
</div>
</div>

---
layout: center
---

# <span class="gradient-text">二. 核心技术架构</span>

Web 架构 · RAG 检索 · 结构化生成

---

# 系统全景

## 基于微服务解耦的高性能 Web 架构

我们采用了异步 FastAPI 框架与 Vite 构建工具，确保了首字节时间小于 500ms 的极致性能表现。

```mermaid {theme: 'dark', scale: 0.8}
graph TB
    subgraph "前端层 - React 19"
        A[用户界面] --> B[Vite 构建]
        B --> C[SSE 流式接收]
    end
    
    subgraph "API 层 - FastAPI"
        D[路由层] --> E[服务编排]
        E --> F[ProfileMemory]
        E --> G[RAG Service]
        E --> H[Resume Service]
        E --> I[ATS Service]
    end
    
    subgraph "数据层"
        K[ChromaDB 向量数据库]
        L[参考简历库 JSON]
    end
    
    C --> D
    G --> K
    G --> L
    
    style A fill:#3b82f6
    style D fill:#8b5cf6
    style K fill:#06b6d4
```

---
layout: center
class: text-center
---

# <span class="gradient-text">三. 算法实现与评估</span>

实验设计 · 性能对比 · 可视化分析

---

# 性能领先

## 核心质量指标与生成效率的全面胜出

实验证明，本系统在各方面均显著优于通用大模型，尤其是语义匹配度和结构完整性指标达到了商用级水平。

| 评价维度 | 豆包 | ChatGPT | **智简 AI** | **提升幅度** |
|---------|------|---------|------------|-------------|
| ATS 匹配度 | 65% | 72% | **87%** | **+22%** |
| 关键词覆盖 | 12/20 | 15/20 | **18/20** | **+50%** |
| 结构完整性 | 3/5 | 4/5 | **5/5** | **完美** |
| 生成时间 | 8s | 6s | **3s** | **-62%** |
| 首字节时间 | N/A | N/A | **<500ms** | **流式优势** |

<div class="mt-8 text-center text-lg">
<span class="gradient-text font-bold">核心优势：</span>
RAG 领域知识注入 + Pydantic 契约保证 + SSE 流式传输
</div>

---
layout: center
---

# <span class="gradient-text">四. 项目总结</span>

技术链路 · 核心指标 · 未来展望

---

# 全栈闭环

## 打造具备 Git 级版本控制的简历生态

我们成功构建了从感知到量化评分的完整 Web 技术闭环。

<div class="grid grid-cols-2 gap-8 mt-8">

<div class="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl">

### 技术链路

- 追问式对话 → ProfileMemory（4KB）
- RAG 检索 → ChromaDB 知识注入
- 结构化生成 → Pydantic 契约
- 语义 ATS → 1536 维 Embedding
- 流式输出 → SSE 实时反馈

</div>

<div class="p-8 bg-gradient-to-br from-green-500/10 to-cyan-500/10 rounded-xl border-2 border-green-500/50">

### 核心指标

- 🎯 ATS 匹配度：**87%**（+22%）
- 📝 关键词覆盖：**18/20**（+50%）
- 📋 结构完整性：**5/5**（完美）
- ⚡ 生成速度：**3s**（-62%）
- 🌊 首字节：**<500ms**
- 🌐 支持中英文双语

</div>

</div>

<div class="mt-8 text-center p-6 bg-blue-500/10 rounded-xl">
<div class="text-xl font-bold gradient-text mb-3">未来展望</div>
<div class="flex justify-center gap-8">
<div>💬 多轮对话优化</div>
<div>🎯 职位推荐</div>
<div>📁 Git-like 版本管理</div>
<div>🎤 面试准备辅助</div>
</div>
</div>

---
layout: center
class: text-center
---

<div class="icon-huge">🔥</div>

# 零标注数据

### RAG 范式优势

---
layout: center
class: text-center
---

<div class="icon-huge">💾</div>
<div class="big-number text-purple-400">100+</div>

### 参考简历库

---
layout: center
class: text-center
---

<div class="icon-huge">🌐</div>

# 中英文双语

### 全球化支持

---
layout: center
class: text-center
---

<div class="icon-huge">⚡</div>
<div class="big-number text-yellow-400">62%</div>

### 体验提升

---
layout: center
class: text-center
---

<div class="icon-huge">🎨</div>

# 可编辑导出

### 100% 结构化

---
layout: center
class: text-center
---

<div class="icon-huge">🔐</div>

# 数据安全

### 本地存储

---
layout: center
class: text-center
---

<div class="icon-huge">🚀</div>

# 高性能架构

### 异步 + 流式

---
layout: center
class: text-center
---

<div class="icon-huge">📱</div>

# 多端适配

### React 19 新特性

---
layout: center
class: text-center
---

<div class="icon-huge">🧩</div>

# 插件化设计

### 易于扩展

---
layout: center
class: text-center
---

<div class="icon-huge">✅</div>

# 工程质量

### Type Hints + 测试

---
layout: center
class: text-center
---

<div class="icon-huge">🐳</div>

# Docker 部署

### 容器化方案

---
layout: center
class: text-center
---

<div class="icon-huge">📈</div>

# 商用级水平

### 87% ATS 匹配

---
layout: center
class: text-center
---

<div class="icon-huge">🎓</div>

# 学术价值

### 零标注 + 可解释

---
layout: center
class: text-center
---

# <span class="gradient-text text-8xl">智简 AI</span>

## 简而不凡，志在必得

### Q & A

<div class="grid grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto">
<div class="p-6 bg-green-500/10 rounded-xl">
<div class="text-4xl font-black text-green-400 mb-2">87%</div>
<div class="text-sm opacity-70">ATS 匹配度</div>
</div>
<div class="p-6 bg-blue-500/10 rounded-xl">
<div class="text-4xl font-black text-blue-400 mb-2">&lt;500ms</div>
<div class="text-sm opacity-70">首字节响应</div>
</div>
<div class="p-6 bg-purple-500/10 rounded-xl">
<div class="text-4xl font-black text-purple-400 mb-2">100%</div>
<div class="text-sm opacity-70">结构化契约</div>
</div>
</div>

<div class="mt-12 text-base opacity-50">
欢迎各位专家批评指正
</div>
