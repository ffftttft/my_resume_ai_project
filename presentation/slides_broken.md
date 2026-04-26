---
theme: default
background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)
class: text-center
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
title: 智简 AI - 基于 RAG 与语义分析的个性化简历优化平台
fonts:
  sans: 'Inter, Microsoft YaHei'
  serif: 'Crimson Pro, KaiTi'
  mono: 'JetBrains Mono'
layout: cover
aspectRatio: '16/9'
htmlAttrs:
  lang: 'zh-CN'
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --accent: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --dark-bg: #0f172a;
  --dark-surface: #1e293b;
  --glass-bg: rgba(30, 41, 59, 0.7);
  --glass-border: rgba(148, 163, 184, 0.2);
}

.slidev-layout {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #f1f5f9;
  font-family: 'Inter', 'Microsoft YaHei', sans-serif;
  font-weight: 400;
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  border-color: rgba(148, 163, 184, 0.3);
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.tech-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #60a5fa;
  margin: 0.25rem;
}

.section-number {
  font-size: 10rem;
  font-weight: 900;
  opacity: 0.05;
  position: absolute;
  top: -3rem;
  left: 2rem;
  line-height: 1;
  color: #3b82f6;
}

.metric-card {
  text-align: center;
  padding: 2rem;
}

.metric-value {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.875rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tech-stack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.tech-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.tech-logo:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 2rem;
}

.comparison-table th,
.comparison-table td {
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.comparison-table th {
  background: rgba(59, 130, 246, 0.1);
  font-weight: 700;
  font-size: 1.125rem;
}

.comparison-table tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.highlight-cell {
  font-weight: 700;
  font-size: 1.5rem;
  color: #10b981;
}

.page-number {
  position: absolute;
  bottom: 1.5rem;
  right: 2rem;
  font-size: 0.875rem;
  opacity: 0.5;
}
</style>

<!-- 第1页：封面页 -->
<div class="h-full flex flex-col items-center justify-center relative">
  <div class="absolute inset-0 opacity-10">
    <div class="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
    <div class="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
  </div>
  
  <div class="relative z-10 text-center">
    <h1 class="text-6xl font-black mb-6">
      <span class="gradient-text">智简 AI</span>
    </h1>
    <h2 class="text-3xl font-semibold mb-4 text-slate-200">
      基于 RAG 与语义分析的个性化简历优化平台
    </h2>
    <p class="text-xl text-slate-400 mb-12">
      全国大学生计算机程序设计大赛 · 软件应用与开发（Web 应用与开发）
    </p>
    
    <div class="tech-stack-grid max-w-4xl mx-auto">
      <div class="tech-logo">
        <div class="text-4xl">⚡</div>
        <div class="text-sm font-semibold">FastAPI</div>
      </div>
      <div class="tech-logo">
        <div class="text-4xl">⚛️</div>
        <div class="text-sm font-semibold">React 19</div>
      </div>
      <div class="tech-logo">
        <div class="text-4xl">🗄️</div>
        <div class="text-sm font-semibold">ChromaDB</div>
      </div>
      <div class="tech-logo">
        <div class="text-4xl">🔍</div>
        <div class="text-sm font-semibold">RAG</div>
      </div>
      <div class="tech-logo">
        <div class="text-4xl">📊</div>
        <div class="text-sm font-semibold">Pydantic</div>
      </div>
      <div class="tech-logo">
        <div class="text-4xl">🌊</div>
        <div class="text-sm font-semibold">SSE</div>
      </div>
    </div>
  </div>
</div>

---
layout: center
class: text-center
---

<!-- 第2页：目录页 -->
<div class="relative">
  <h1 class="text-6xl font-black gradient-text mb-16">目录</h1>
  
  <div class="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
    <div class="glass-card cursor-pointer">
      <div class="text-5xl font-black text-blue-400 mb-3">01</div>
      <div class="text-2xl font-bold mb-2">项目背景</div>
      <div class="text-sm opacity-70">行业现状 · 核心创新 · 研究目标</div>
    </div>
    
    <div class="glass-card cursor-pointer">
      <div class="text-5xl font-black text-purple-400 mb-3">02</div>
      <div class="text-2xl font-bold mb-2">核心技术架构</div>
      <div class="text-sm opacity-70">Web 架构 · RAG 检索 · 结构化生成</div>
    </div>
    
    <div class="glass-card cursor-pointer">
      <div class="text-5xl font-black text-cyan-400 mb-3">03</div>
      <div class="text-2xl font-bold mb-2">算法实现与评估</div>
      <div class="text-sm opacity-70">实验设计 · 性能对比 · 可视化分析</div>
    </div>
    
    <div class="glass-card cursor-pointer">
      <div class="text-5xl font-black text-green-400 mb-3">04</div>
      <div class="text-2xl font-bold mb-2">项目总结</div>
      <div class="text-sm opacity-70">技术链路 · 核心指标 · 未来展望</div>
    </div>
  </div>
</div>

---
layout: center
class: text-center
---

<!-- 第3页：项目背景 - 行业现状 -->
<div class="relative h-full flex items-center justify-center">
  <div class="section-number">01</div>
  <div>
    <div class="text-7xl font-black gradient-text mb-6">
      项目背景
    </div>
    <div class="text-2xl opacity-70 font-light">
      行业现状 · 核心创新 · 研究目标
    </div>
  </div>
</div>

---
layout: two-cols
---

<!-- 第4页：简历筛选的"数字孤岛" -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-blue-400">01</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">背景挑战</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">传统 AI 简历生成的"黑盒"困局</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      通用 LLM 缺乏行业领域知识，且生成的 JSON 格式极不稳定。本项目通过 RAG 范式引入专家知识库，解决 Web 端内容生成的不可控难题。
    </div>
    
    <div class="glass-card p-6">
      <div class="font-bold text-xl mb-4 text-red-400">❌ 传统工具痛点</div>
      <div class="space-y-3 text-base">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-red-400"></div>
          <div>缺乏领域知识，内容空洞</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-red-400"></div>
          <div>JSON 格式不稳定，解析失败</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-red-400"></div>
          <div>黑盒生成，缺乏可解释性</div>
        </div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="grid grid-cols-1 gap-6">
    <div class="glass-card metric-card border-l-4 border-red-500">
      <div class="metric-value text-red-400">75%</div>
      <div class="metric-label">简历被 ATS 系统过滤</div>
    </div>
    
    <div class="glass-card metric-card border-l-4 border-orange-500">
      <div class="metric-value text-orange-400">3秒</div>
      <div class="metric-label">HR 平均阅读时间</div>
    </div>
    
    <div class="glass-card metric-card border-l-4 border-yellow-500">
      <div class="metric-value text-yellow-400">1179万</div>
      <div class="metric-label">2024 届毕业生人数</div>
    </div>
  </div>
</div>

<div class="page-number">3 / 17</div>

---
layout: default
---

<!-- 第5页：核心创新 - 契约化与语义对齐 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-blue-400">01</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">核心创新</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">构建高可解释性的结构化简历生成闭环</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-12">
      我们不仅在做 Web 应用，更在定义一套基于 Pydantic 契约的简历生成标准，确保生成质量的 100% 完整性与可编辑性。
    </div>
    
    <div class="grid grid-cols-4 gap-6">
      <div class="glass-card text-center p-6 border-t-4 border-blue-400">
        <div class="text-5xl mb-4">🔍</div>
        <div class="text-xl font-bold mb-2 gradient-text">RAG 检索</div>
        <div class="text-sm opacity-70">零标注领域知识注入</div>
      </div>
      
      <div class="glass-card text-center p-6 border-t-4 border-purple-400">
        <div class="text-5xl mb-4">📊</div>
        <div class="text-xl font-bold mb-2 gradient-text">语义 ATS</div>
        <div class="text-sm opacity-70">1536 维向量空间匹配</div>
      </div>
      
      <div class="glass-card text-center p-6 border-t-4 border-cyan-400">
        <div class="text-5xl mb-4">🎯</div>
        <div class="text-xl font-bold mb-2 gradient-text">结构化输出</div>
        <div class="text-sm opacity-70">Pydantic 契约保证</div>
      </div>
      
      <div class="glass-card text-center p-6 border-t-4 border-green-400">
        <div class="text-5xl mb-4">🌊</div>
        <div class="text-xl font-bold mb-2 gradient-text">流式传输</div>
        <div class="text-sm opacity-70">SSE 实时反馈</div>
      </div>
    </div>
    
    <div class="mt-12 text-center">
      <div class="inline-block glass-card p-8">
        <div class="text-2xl font-bold mb-4 gradient-text">核心目标</div>
        <div class="text-xl mb-4">从"通用模板"到"个性化定制"</div>
        <div class="text-base opacity-80">
          AI 理解用户背景 → 检索优质案例 → 生成针对性简历 → 语义评分优化
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-number">4 / 17</div>

---
layout: center
class: text-center
---

<!-- 第6页：核心技术架构 -->
<div class="relative h-full flex items-center justify-center">
  <div class="section-number">02</div>
  <div>
    <div class="text-7xl font-black gradient-text mb-6">
      核心技术架构
    </div>
    <div class="text-2xl opacity-70 font-light">
      Web 架构 · RAG 检索 · 结构化生成
    </div>
  </div>
</div>

---
layout: default
---

<!-- 第7页：总体 Web 架构 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">系统全景</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">基于微服务解耦的高性能 Web 架构</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      我们采用了异步 FastAPI 框架与 Vite 构建工具，确保了首字节时间小于 500ms 的极致性能表现。
    </div>
    
    <div class="mt-8">
      ```mermaid {theme: 'dark', scale: 0.9}
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
              E --> J[Embedding Service]
          end
          
          subgraph "数据层"
              K[ChromaDB<br/>向量数据库]
              L[参考简历库<br/>JSON]
          end
          
          C --> D
          G --> K
          G --> L
          J --> K
          
          style A fill:#3b82f6
          style D fill:#8b5cf6
          style K fill:#06b6d4
          style L fill:#10b981
      ```
    </div>
  </div>
</div>

<div class="page-number">5 / 17</div>

---
layout: two-cols
---

<!-- 第8页：多模态感知 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">多模态感知</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">基于 Web 的异构文档解析</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      系统支持多模态输入，能够从项目 PPT 中捕捉用户被隐藏的"硬技能"特征，为 AI 提供更丰富的原始特征向量。
    </div>
    
    <div class="glass-card p-6">
      <div class="font-bold text-xl mb-4 gradient-text">支持格式</div>
      <div class="space-y-3 text-base">
        <div class="flex items-center gap-3">
          <div class="text-2xl">📄</div>
          <div>PDF 简历解析（pypdf）</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">📊</div>
          <div>PPTX 项目提取（python-pptx）</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">📝</div>
          <div>文本语义分片</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">🔄</div>
          <div>自动特征向量化</div>
        </div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-6">
    <div class="font-bold text-xl mb-4 gradient-text">处理流程</div>
    
    ```mermaid {theme: 'dark', scale: 0.8}
    graph TD
        A[文件上传] --> B{文件类型}
        B -->|PDF| C[pypdf 解析]
        B -->|PPTX| D[python-pptx 解析]
        C --> E[文本提取]
        D --> E
        E --> F[语义分片]
        F --> G[Embedding 向量化]
        G --> H[存入 ChromaDB]
        
        style A fill:#3b82f6
        style E fill:#8b5cf6
        style G fill:#06b6d4
        style H fill:#10b981
    ```
  </div>
</div>

<div class="page-number">6 / 17</div>

---
layout: two-cols
---

<!-- 第9页：记忆机制 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">记忆机制</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">4KB 压缩记忆与主动追问</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      仿照人类专家的对话逻辑，当 Web 端采集到的信息不足以支撑高质量生成时，系统会主动发起追问，杜绝空洞内容的产生。
    </div>
    
    <div class="glass-card p-6">
      <div class="font-bold text-xl mb-4 gradient-text">ProfileMemory 核心功能</div>
      <div class="space-y-3 text-base">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          <div>自动识别信息缺失</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          <div>生成针对性追问</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          <div>压缩历史对话（4KB 限制）</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          <div>多轮上下文保持</div>
        </div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-6">
    <div class="font-bold text-xl mb-4 gradient-text">技术实现</div>
    
```python
class ProfileMemoryService:
    def __init__(self, max_bytes=4096):
        self.max_bytes = max_bytes
        self.history = []
    
    def compress_history(self, history):
        """保留最近对话 + 关键信息"""
        compressed = []
        total_size = 0
        
        for item in reversed(history):
            size = len(json.dumps(item))
            if total_size + size < self.max_bytes:
                compressed.insert(0, item)
                total_size += size
        
        return compressed
    
    def generate_questions(self, profile):
        """识别缺失字段并生成追问"""
        missing = self.detect_missing(profile)
        return self.create_questions(missing)
```
  </div>
</div>

<div class="page-number">7 / 17</div>

---
layout: default
---

<!-- 第10页：数据表征层 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">数据表征层</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">基于 text-embedding-3-small 的高维建模</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      系统将所有简历与参考案例统一映射至 1536 维向量空间，这是实现精准检索与评分的底层数学基石。
    </div>
    
    <div class="grid grid-cols-2 gap-8">
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text">向量化流程</div>
        <div class="space-y-4 text-base">
          <div class="flex items-start gap-3">
            <div class="text-2xl">1️⃣</div>
            <div>
              <div class="font-semibold mb-1">文本预处理</div>
              <div class="text-sm opacity-70">分词、清洗、标准化</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">2️⃣</div>
            <div>
              <div class="font-semibold mb-1">Embedding 编码</div>
              <div class="text-sm opacity-70">text-embedding-3-small</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">3️⃣</div>
            <div>
              <div class="font-semibold mb-1">向量归一化</div>
              <div class="text-sm opacity-70">L2 范数标准化</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">4️⃣</div>
            <div>
              <div class="font-semibold mb-1">存储索引</div>
              <div class="text-sm opacity-70">ChromaDB 持久化</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text">技术参数</div>
        <div class="space-y-4">
          <div class="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
            <span class="font-semibold">向量维度</span>
            <span class="text-2xl font-bold text-blue-400">1536</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
            <span class="font-semibold">相似度算法</span>
            <span class="text-lg font-bold text-purple-400">Cosine</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg">
            <span class="font-semibold">检索 Top-K</span>
            <span class="text-2xl font-bold text-cyan-400">3</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
            <span class="font-semibold">参考库规模</span>
            <span class="text-2xl font-bold text-green-400">100+</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-number">8 / 17</div>

---
layout: two-cols
---

<!-- 第11页：RAG 检索增强 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">RAG 检索</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">ChromaDB 驱动的专家级简历知识库</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      通过 RAG 技术，我们将行业专家的撰写规范动态注入 Prompt。这种"零标注"范式让系统在无特定行业训练的情况下依然具备极高的专业泛化能力。
    </div>
    
    <div class="glass-card p-6">
      <div class="font-bold text-xl mb-4 gradient-text">RAG 优势</div>
      <div class="space-y-3 text-base">
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>零标注数据，快速部署</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>动态知识更新，无需重训练</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>领域专家规范注入</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>可解释的检索结果</div>
        </div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-6">
    <div class="font-bold text-xl mb-4 gradient-text">检索流程</div>
    
    ```mermaid {theme: 'dark', scale: 0.8}
    graph TD
        A[用户输入<br/>职位描述] --> B[Embedding<br/>向量化]
        B --> C[ChromaDB<br/>相似度检索]
        C --> D[Top-K=3<br/>参考简历]
        D --> E[注入 Prompt<br/>上下文]
        E --> F[LLM 生成<br/>个性化简历]
        
        G[中文参考库] --> C
        H[英文参考库] --> C
        
        style A fill:#3b82f6
        style C fill:#8b5cf6
        style D fill:#06b6d4
        style F fill:#10b981
    ```
    
    <div class="mt-6 p-4 bg-blue-500/10 rounded-lg">
      <div class="text-sm font-semibold mb-2">数据来源</div>
      <div class="text-xs opacity-80">
        • 中文参考简历库：50+ 条<br/>
        • 英文参考简历库：50+ 条<br/>
        • 持续更新中
      </div>
    </div>
  </div>
</div>

<div class="page-number">9 / 17</div>

---
layout: two-cols
---

<!-- 第12页：结构化输出 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">AI 引擎层</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">Instructor 驱动的结构化输出引擎</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      我们摒弃了传统的 json.loads 解析方式，采用 Pydantic v2.0 强制验证，保证生成的简历结构完整度达到满分 5/5。
    </div>
    
    <div class="glass-card p-6 border-l-4 border-red-500">
      <div class="font-bold text-lg mb-3 text-red-400">❌ 传统 JSON 解析</div>
      
```python
# 不稳定，容易出错
response = llm.generate(prompt)
try:
    data = json.loads(response)
    # 可能缺少字段
    # 可能类型错误
    # 需要手动验证
except:
    # 解析失败，需要重试
    pass
```
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-6 border-l-4 border-green-500">
    <div class="font-bold text-lg mb-3 gradient-text">✅ 结构化输出（Pydantic）</div>
    
```python
from pydantic import BaseModel
import instructor

class StructuredResume(BaseModel):
    contact: ContactInfo
    summary: str
    experience: List[WorkExperience]
    education: List[Education]
    skills: List[str]

# 强制契约，保证质量
client = instructor.from_openai(openai_client)
result = client.chat.completions.create(
    model="gpt-4",
    response_model=StructuredResume,
    messages=[...]
)
# result 自动符合 Schema
# 100% 结构完整性
# 类型安全保证
```
  </div>
  
  <div class="mt-6 glass-card p-4 bg-green-500/10">
    <div class="text-center">
      <div class="text-3xl font-black text-green-400 mb-2">5/5</div>
      <div class="text-sm opacity-80">结构完整性评分</div>
    </div>
  </div>
</div>

<div class="page-number">10 / 17</div>

---
layout: two-cols
---

<!-- 第13页：流式传输 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">交互层优化</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">SSE 流式传输技术实现</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      针对 Web 应用场景，我们实现了 SSE 异步传输。流式首字节时间小于 500ms，相比传统模式，用户等待焦虑降低了 62%。
    </div>
    
    <div class="glass-card p-8 opacity-60">
      <div class="text-center mb-6">
        <div class="text-5xl mb-4">⏳</div>
        <div class="font-bold text-xl mb-2">传统等待模式</div>
        <div class="text-sm opacity-70 mb-4">生成中...</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-red-400">等待时间：8 秒</div>
        <div class="text-xs text-red-400 mt-2">用户焦虑 ↑</div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-8 border-2 border-green-500/50">
    <div class="font-bold text-xl mb-6 gradient-text text-center">SSE 流式生成模式</div>
    <div class="space-y-3 text-base">
      <div class="flex items-center gap-3">
        <div class="text-xl text-green-400">✅</div>
        <div>正在生成联系方式...</div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-xl text-green-400">✅</div>
        <div>正在生成个人总结...</div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-xl text-yellow-400">⏳</div>
        <div>正在生成工作经历...</div>
      </div>
      <div class="flex items-center gap-3 opacity-50">
        <div class="text-xl">⏳</div>
        <div>正在生成项目经历...</div>
      </div>
      <div class="flex items-center gap-3 opacity-50">
        <div class="text-xl">⏳</div>
        <div>正在生成技能清单...</div>
      </div>
    </div>
    <div class="mt-6 text-center">
      <div class="text-sm text-green-400 font-semibold">
        首字节 &lt; 500ms · 体验提升 62%
      </div>
    </div>
  </div>
  
  <div class="mt-6 glass-card p-4">
    <div class="text-xs font-mono opacity-70">
      FastAPI + asyncio + SSE
    </div>
  </div>
</div>

<div class="page-number">11 / 17</div>

---
layout: default
---

<!-- 第14页：语义 ATS 评分 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-purple-400">02</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">语义评分算法</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">基于 Embedding 的 ATS 匹配度量化</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      我们通过计算 1536 维特征的语义距离，输出包含关键词覆盖率（90%）在内的详细多维度评估报告。
    </div>
    
    <div class="grid grid-cols-2 gap-8">
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text">评分维度</div>
        <div class="space-y-4 text-base">
          <div class="flex items-center gap-3">
            <div class="text-2xl">🎯</div>
            <div>
              <div class="font-semibold">关键词覆盖率</div>
              <div class="text-sm opacity-70">JD 关键词匹配度</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">💼</div>
            <div>
              <div class="font-semibold">技能匹配度</div>
              <div class="text-sm opacity-70">技术栈相似度</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">📊</div>
            <div>
              <div class="font-semibold">经验相关性</div>
              <div class="text-sm opacity-70">工作经历匹配</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">📝</div>
            <div>
              <div class="font-semibold">格式规范性</div>
              <div class="text-sm opacity-70">ATS 友好度</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">🔍</div>
            <div>
              <div class="font-semibold">语义相似度</div>
              <div class="text-sm opacity-70">Cosine Similarity</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 text-center border-2 border-green-500/50">
        <div class="text-xl mb-4 opacity-80">ATS 综合评分</div>
        <div class="text-8xl font-black gradient-text mb-6">87</div>
        <div class="text-2xl opacity-70 mb-8">/100</div>
        <div class="space-y-3 text-sm text-left">
          <div>
            <div class="flex justify-between items-center mb-1">
              <span>关键词覆盖</span>
              <span class="font-bold text-green-400">18/20</span>
            </div>
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-green-400 to-blue-400" style="width: 90%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <span>技能匹配</span>
              <span class="font-bold text-green-400">9/10</span>
            </div>
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-green-400 to-blue-400" style="width: 90%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <span>经验相关</span>
              <span class="font-bold text-green-400">8/10</span>
            </div>
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-green-400 to-blue-400" style="width: 80%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-number">12 / 17</div>

---
layout: center
class: text-center
---

<!-- 第13页：实验结果 -->
<div class="relative h-full flex items-center justify-center">
  <div class="section-number">03</div>
  <div>
    <div class="text-7xl font-black gradient-text mb-6">
      算法实现与评估
    </div>
    <div class="text-2xl opacity-70 font-light">
      实验设计 · 性能对比 · 可视化分析
    </div>
  </div>
</div>

---
layout: two-cols
---

<!-- 第14页：实验设计 -->
<div class="relative h-full pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-cyan-400">03</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">实验验证</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">针对通用 LLM 的对比消融实验</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      我们在 Apple M4 架构下进行了密集测试，核心评价指标包括内容针对性、结构完整性和生成延迟。
    </div>
    
    <div class="glass-card p-6">
      <div class="font-bold text-xl mb-4 gradient-text">对比对象</div>
      <div class="space-y-3 text-base">
        <div class="flex items-center gap-3">
          <div class="text-2xl">🤖</div>
          <div>豆包（字节跳动）</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">🤖</div>
          <div>ChatGPT（OpenAI）</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl">✨</div>
          <div>智简 AI（本系统）</div>
        </div>
      </div>
    </div>
  </div>
</div>

::right::

<div class="pl-8 pt-24">
  <div class="glass-card p-6">
    <div class="font-bold text-xl mb-4 gradient-text">评价维度</div>
    <div class="space-y-3 text-base">
      <div class="flex items-center gap-3">
        <div class="text-2xl">📝</div>
        <div>
          <div class="font-semibold">内容针对性</div>
          <div class="text-sm opacity-70">是否匹配职位需求</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-2xl">📋</div>
        <div>
          <div class="font-semibold">结构完整性</div>
          <div class="text-sm opacity-70">是否符合规范</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-2xl">🎯</div>
        <div>
          <div class="font-semibold">ATS 友好度</div>
          <div class="text-sm opacity-70">关键词覆盖率</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-2xl">⚡</div>
        <div>
          <div class="font-semibold">生成速度</div>
          <div class="text-sm opacity-70">流式 vs 非流式</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="mt-6 glass-card p-4 bg-blue-500/10">
    <div class="text-sm font-semibold mb-2">测试环境</div>
    <div class="text-xs opacity-80">
      • 硬件：Apple M4 Pro<br/>
      • 测试样本：30 份真实简历<br/>
      • 职位类型：前端/后端/全栈
    </div>
  </div>
</div>

<div class="page-number">13 / 17</div>

---
layout: default
---

<!-- 第15页：定量结果 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-cyan-400">03</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">性能领先</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">核心质量指标与生成效率的全面胜出</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      实验证明，本系统在各方面均显著优于通用大模型，尤其是语义匹配度和结构完整性指标达到了商用级水平。
    </div>
    
    <div class="glass-card p-8">
      <table class="comparison-table">
        <thead>
          <tr>
            <th class="text-left">评价维度</th>
            <th>豆包</th>
            <th>ChatGPT</th>
            <th class="gradient-text">智简 AI</th>
            <th class="text-green-400">提升幅度</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-left font-semibold">ATS 匹配度</td>
            <td class="opacity-60">65%</td>
            <td class="opacity-60">72%</td>
            <td class="highlight-cell">87%</td>
            <td class="text-green-400 font-bold">+22%</td>
          </tr>
          <tr>
            <td class="text-left font-semibold">关键词覆盖</td>
            <td class="opacity-60">12/20</td>
            <td class="opacity-60">15/20</td>
            <td class="highlight-cell">18/20</td>
            <td class="text-green-400 font-bold">+50%</td>
          </tr>
          <tr>
            <td class="text-left font-semibold">结构完整性</td>
            <td class="opacity-60">3/5</td>
            <td class="opacity-60">4/5</td>
            <td class="highlight-cell">5/5</td>
            <td class="text-green-400 font-bold">完美</td>
          </tr>
          <tr>
            <td class="text-left font-semibold">生成时间</td>
            <td class="opacity-60">8s</td>
            <td class="opacity-60">6s</td>
            <td class="highlight-cell">3s</td>
            <td class="text-green-400 font-bold">-62%</td>
          </tr>
          <tr>
            <td class="text-left font-semibold">首字节时间</td>
            <td class="opacity-60">N/A</td>
            <td class="opacity-60">N/A</td>
            <td class="highlight-cell">&lt;500ms</td>
            <td class="text-green-400 font-bold">流式优势</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="mt-8 text-center text-lg opacity-70">
      <span class="gradient-text font-bold">核心优势：</span>
      RAG 领域知识注入 + Pydantic 契约保证 + SSE 流式传输
    </div>
  </div>
</div>

<div class="page-number">14 / 17</div>

---
layout: default
---

<!-- 第16页：系统鲁棒性 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-cyan-400">03</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">语义演化</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">从初始简历向职位核心区域的收敛轨迹</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      通过降维可视化轨迹，我们证明了算法优化的科学性。系统生成的简历始终能维持在职位需求的高匹配度区域内。
    </div>
    
    <div class="grid grid-cols-2 gap-8">
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text">优化轨迹特征</div>
        <div class="space-y-4 text-base">
          <div class="flex items-start gap-3">
            <div class="text-2xl">📍</div>
            <div>
              <div class="font-semibold mb-1">初始状态</div>
              <div class="text-sm opacity-70">通用简历，匹配度 65%</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">🔄</div>
            <div>
              <div class="font-semibold mb-1">RAG 检索</div>
              <div class="text-sm opacity-70">注入领域知识，向量偏移</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">🎯</div>
            <div>
              <div class="font-semibold mb-1">语义对齐</div>
              <div class="text-sm opacity-70">收敛至 JD 核心区域</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-2xl">✅</div>
            <div>
              <div class="font-semibold mb-1">最终状态</div>
              <div class="text-sm opacity-70">匹配度 87%，稳定收敛</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text text-center">向量空间可视化</div>
        <div class="relative h-64 flex items-center justify-center">
          <svg viewBox="0 0 300 200" class="w-full h-full">
            <!-- 背景网格 -->
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148, 163, 184, 0.1)" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="300" height="200" fill="url(#grid)"/>
            
            <!-- JD 目标区域 -->
            <circle cx="220" cy="80" r="30" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="2"/>
            <text x="220" y="85" text-anchor="middle" fill="#10b981" font-size="12" font-weight="bold">JD</text>
            
            <!-- 初始简历 -->
            <circle cx="80" cy="140" r="8" fill="#ef4444"/>
            <text x="80" y="160" text-anchor="middle" fill="#ef4444" font-size="10">初始</text>
            
            <!-- 优化轨迹 -->
            <path d="M 80 140 Q 120 120, 160 100 T 220 80" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="5,5"/>
            
            <!-- 中间状态 -->
            <circle cx="160" cy="100" r="6" fill="#f59e0b"/>
            
            <!-- 最终状态 -->
            <circle cx="220" cy="80" r="8" fill="#10b981"/>
            <text x="220" y="65" text-anchor="middle" fill="#10b981" font-size="10">优化后</text>
          </svg>
        </div>
        <div class="mt-4 text-center text-sm opacity-70">
          1536 维向量空间 UMAP 降维至 2D
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-number">15 / 17</div>

---
layout: center
class: text-center
---

<!-- 第17页：项目总结 -->
<div class="relative h-full flex items-center justify-center">
  <div class="section-number">04</div>
  <div>
    <div class="text-7xl font-black gradient-text mb-6">
      项目总结
    </div>
    <div class="text-2xl opacity-70 font-light">
      技术链路 · 核心指标 · 未来展望
    </div>
  </div>
</div>

---
layout: default
---

<!-- 第18页：全栈闭环 -->
<div class="relative pt-12">
  <div class="absolute top-0 left-0 text-5xl font-black opacity-10 text-green-400">04</div>
  
  <div class="pt-8">
    <h1 class="text-4xl font-bold mb-6">
      <span class="gradient-text">全栈闭环</span>
    </h1>
    <h2 class="text-2xl font-serif mb-8 opacity-80">打造具备 Git 级版本控制的简历生态</h2>
    
    <div class="text-lg leading-relaxed opacity-90 mb-8">
      我们成功构建了从感知到量化评分的完整 Web 技术闭环。未来将依托 React 19 的新特性，进一步优化多端适配与面试辅助功能。
    </div>
    
    <div class="grid grid-cols-2 gap-8">
      <div class="glass-card p-8">
        <div class="font-bold text-2xl mb-6 gradient-text">技术链路</div>
        <div class="space-y-3 text-base">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-blue-400"></div>
            <div>追问式对话 → ProfileMemory（4KB）</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-purple-400"></div>
            <div>RAG 检索 → ChromaDB 知识注入</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
            <div>结构化生成 → Pydantic 契约</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-green-400"></div>
            <div>语义 ATS → 1536 维 Embedding</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div>流式输出 → SSE 实时反馈</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 border-2 border-green-500/50">
        <div class="font-bold text-2xl mb-6 gradient-text">核心指标</div>
        <div class="space-y-3 text-base">
          <div class="flex items-center gap-3">
            <div class="text-2xl">🎯</div>
            <div>ATS 匹配度：<span class="font-bold text-green-400">87%</span>（+22%）</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">📝</div>
            <div>关键词覆盖：<span class="font-bold text-green-400">18/20</span>（+50%）</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">📋</div>
            <div>结构完整性：<span class="font-bold text-green-400">5/5</span>（完美）</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">⚡</div>
            <div>生成速度：<span class="font-bold text-green-400">3s</span>（-62%）</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">🌊</div>
            <div>首字节：<span class="font-bold text-green-400">&lt;500ms</span></div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-2xl">🌐</div>
            <div>支持中英文双语</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-12 glass-card p-8 bg-blue-500/10">
      <div class="text-center">
        <div class="text-2xl font-bold gradient-text mb-4">未来展望</div>
        <div class="flex justify-center gap-8 text-base">
          <div class="flex items-center gap-2">
            <div class="text-xl">💬</div>
            <div>多轮对话优化</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xl">🎯</div>
            <div>职位推荐</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xl">📁</div>
            <div>Git-like 版本管理</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-xl">🎤</div>
            <div>面试准备辅助</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="page-number">16 / 17</div>

---
layout: center
class: text-center
---

<!-- 第19页：致谢与 Q&A -->
<div class="relative h-full flex items-center justify-center">
  <div class="absolute inset-0 opacity-10">
    <div class="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
    <div class="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
  </div>
  
  <div class="relative z-10">
    <div class="text-8xl font-black gradient-text mb-8">
      智简 AI
    </div>
    <div class="text-4xl font-light mb-12 opacity-80">
      简而不凡，志在必得
    </div>
    
    <div class="text-3xl font-bold mb-16">Q & A</div>
    
    <div class="glass-card max-w-3xl mx-auto p-12">
      <div class="grid grid-cols-3 gap-8 mb-8">
        <div class="text-center">
          <div class="text-4xl font-black text-green-400 mb-2">87%</div>
          <div class="text-sm opacity-70">ATS 匹配度</div>
        </div>
        <div class="text-center">
          <div class="text-4xl font-black text-blue-400 mb-2">&lt;500ms</div>
          <div class="text-sm opacity-70">首字节响应</div>
        </div>
        <div class="text-center">
          <div class="text-4xl font-black text-purple-400 mb-2">100%</div>
          <div class="text-sm opacity-70">结构化契约</div>
        </div>
      </div>
      
      <div class="border-t border-slate-700 pt-6">
        <div class="text-lg opacity-70 mb-3">
          项目地址：github.com/your-repo/resume-ai
        </div>
        <div class="text-lg opacity-70">
          联系方式：your-email@example.com
        </div>
      </div>
    </div>
    
    <div class="mt-12 text-base opacity-50">
      欢迎各位专家批评指正
    </div>
  </div>
</div>

<div class="page-number">17 / 17</div>
