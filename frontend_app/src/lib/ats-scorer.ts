export type ATSScoreBreakdown = {
  key: string;
  label: string;
  score: number;
  weight: number;
};

export type ATSScoreResult = {
  overallScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  improvementTip: string;
  mode?: string;
  semanticSimilarity?: number;
  keywordCoverage?: number;
  provider?: string;
  model?: string;
  scoreBreakdown?: ATSScoreBreakdown[];
  riskFlags?: string[];
  scoringVersion?: string;
};

type KeywordCategory = "hard" | "soft" | "experience" | "general";

type WeightedKeyword = {
  label: string;
  normalized: string;
  category: KeywordCategory;
  weight: number;
};

type ResumeSignals = {
  text: string;
  hasContact: boolean;
  hasSummary: boolean;
  hasSkills: boolean;
  hasEducation: boolean;
  hasExperience: boolean;
  hasProject: boolean;
  bulletCount: number;
  quantifiedCount: number;
  actionHits: number;
};

const STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "for",
  "with",
  "in",
  "on",
  "at",
  "by",
  "from",
  "using",
  "use",
  "ability",
  "experience",
  "years",
  "year",
  "required",
  "preferred",
  "requirements",
  "candidate",
  "role",
  "position",
  "job",
  "team",
  "熟悉",
  "掌握",
  "了解",
  "具备",
  "负责",
  "参与",
  "能够",
  "需要",
  "优先",
  "相关",
  "岗位",
  "职位",
  "要求",
  "能力",
  "经验",
  "以上",
  "以及",
  "我们",
  "你将",
  "良好",
  "优秀",
]);

const ALIAS_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  nodejs: "node.js",
  node: "node.js",
  reactjs: "react",
  vuejs: "vue",
  nextjs: "next.js",
  restful: "rest api",
  rest: "rest api",
  golang: "go",
  k8s: "kubernetes",
  powerbi: "power bi",
  sklearn: "scikit-learn",
  scikitlearn: "scikit-learn",
};

const SAFE_SHORT_ENGLISH_TERMS = new Set(["bi", "go", "qa", "ui", "ux"]);

const HARD_SKILL_TERMS = new Set([
  "python",
  "java",
  "javascript",
  "typescript",
  "sql",
  "mysql",
  "postgresql",
  "redis",
  "excel",
  "power bi",
  "tableau",
  "pandas",
  "numpy",
  "matplotlib",
  "scikit-learn",
  "spark",
  "hive",
  "flink",
  "airflow",
  "etl",
  "linux",
  "git",
  "docker",
  "kubernetes",
  "spring",
  "spring boot",
  "react",
  "vue",
  "node.js",
  "fastapi",
  "机器学习",
  "深度学习",
  "自然语言处理",
  "数据分析",
  "数据处理",
  "数据清洗",
  "数据可视化",
  "统计分析",
  "统计建模",
  "特征工程",
  "用户行为分析",
  "报表",
  "仪表盘",
  "数据仓库",
  "数据库",
  "算法",
  "多线程",
  "并发",
]);

const SOFT_SKILL_TERMS = new Set([
  "communication",
  "collaboration",
  "teamwork",
  "leadership",
  "ownership",
  "problem solving",
  "stakeholder management",
  "mentoring",
  "沟通",
  "协作",
  "团队合作",
  "推动",
  "复盘",
  "汇报",
  "需求分析",
  "方案讨论",
  "问题解决",
]);

const EXPERIENCE_TERMS = new Set([
  "backend",
  "frontend",
  "data analyst",
  "data engineer",
  "software engineer",
  "开发",
  "分析",
  "优化",
  "设计",
  "实现",
  "构建",
  "交付",
  "维护",
  "上线",
  "迭代",
  "项目",
  "实习",
  "数据分析师",
  "软件开发",
]);

const ACTION_TERMS = [
  "负责",
  "参与",
  "设计",
  "实现",
  "优化",
  "构建",
  "完成",
  "推动",
  "落地",
  "维护",
  "分析",
  "developed",
  "built",
  "designed",
  "optimized",
  "delivered",
  "implemented",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function hasCjk(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function normalizeToken(value: string): string {
  const normalized = (value || "")
    .toLowerCase()
    .replace(/[()（）[\]{}，。；：、|｜]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = normalized.replace(/\s+/g, "");
  return ALIAS_MAP[compact] || ALIAS_MAP[normalized] || normalized;
}

function isNoiseKeyword(token: string): boolean {
  if (!token || STOP_WORDS.has(token)) return true;
  if (!hasCjk(token) && /^[a-z]+$/.test(token) && token.length === 2 && !SAFE_SHORT_ENGLISH_TERMS.has(token)) {
    return true;
  }
  return hasCjk(token) && token.length < 2;
}

function displayLabel(token: string): string {
  if (hasCjk(token)) return token;
  const special: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    "node.js": "Node.js",
    "rest api": "REST API",
    "power bi": "Power BI",
    sql: "SQL",
    etl: "ETL",
  };
  if (special[token]) return special[token];
  return token
    .split(" ")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function categoryFor(token: string): KeywordCategory {
  if (HARD_SKILL_TERMS.has(token)) return "hard";
  if (SOFT_SKILL_TERMS.has(token)) return "soft";
  if (EXPERIENCE_TERMS.has(token)) return "experience";
  if (/[.+#]|\d/.test(token)) return "hard";
  return "general";
}

function containsTerm(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  if (hasCjk(keyword)) return text.includes(keyword);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.])`).test(text);
}

function addKeyword(
  map: Map<string, WeightedKeyword>,
  token: string,
  category?: KeywordCategory,
  weight = 1,
) {
  const normalized = normalizeToken(token);
  if (isNoiseKeyword(normalized)) return;
  const resolvedCategory = category || categoryFor(normalized);
  const existing = map.get(normalized);
  if (existing) {
    existing.weight += weight;
    if (existing.category === "general" && resolvedCategory !== "general") {
      existing.category = resolvedCategory;
      existing.label = displayLabel(normalized);
    }
    return;
  }
  map.set(normalized, {
    label: displayLabel(normalized),
    normalized,
    category: resolvedCategory,
    weight,
  });
}

function extractKeywords(jobDescription: string, limit = 18): WeightedKeyword[] {
  const map = new Map<string, WeightedKeyword>();
  const normalizedText = normalizeToken(jobDescription);
  const knownTerms = [...HARD_SKILL_TERMS, ...SOFT_SKILL_TERMS, ...EXPERIENCE_TERMS].sort(
    (left, right) => right.length - left.length,
  );

  knownTerms.forEach((term) => {
    const normalized = normalizeToken(term);
    if (!containsTerm(normalizedText, normalized)) return;
    const base = HARD_SKILL_TERMS.has(normalized) ? 2.8 : EXPERIENCE_TERMS.has(normalized) ? 1.6 : 1.0;
    addKeyword(map, normalized, categoryFor(normalized), base);
  });

  jobDescription
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const lineBoost = index <= 2 ? 0.6 : 0;
      const listBoost = /^[-*•\d]/.test(line) ? 0.35 : 0;
      const matches = line.match(/[A-Za-z][A-Za-z0-9.+#/-]{1,}|[\u4e00-\u9fff]{2,10}/g) || [];
      matches.forEach((match) => {
        const normalized = normalizeToken(match);
        if (isNoiseKeyword(normalized)) return;
        const category = categoryFor(normalized);
        if (hasCjk(normalized) && category === "general") return;
        const categoryBoost = category === "hard" ? 0.9 : category === "experience" ? 0.45 : 0.2;
        const lengthBoost = Math.min(0.5, normalized.length * (hasCjk(normalized) ? 0.055 : 0.03));
        addKeyword(map, normalized, category, 1 + lineBoost + listBoost + categoryBoost + lengthBoost);
      });
    });

  return [...map.values()]
    .sort((left, right) => right.weight - left.weight || Number(left.category !== "hard") - Number(right.category !== "hard"))
    .slice(0, limit);
}

function flattenResumeData(resumeData: Record<string, any>): string {
  const candidate = asObject(resumeData);
  const structured = asObject(candidate.structured_resume || candidate.structuredResume || candidate);
  const contact = asObject(structured.contact);
  const textParts = [
    asString(candidate.resume_text || candidate.resumeText),
    asString(contact.full_name),
    asString(contact.target_role),
    asString(contact.target_company),
    asString(contact.email),
    asString(contact.phone),
    asString(contact.city),
    asString(structured.summary),
  ];

  asArray(structured.skills).forEach((group) => {
    const item = asObject(group);
    textParts.push(asString(item.category));
    asArray(item.items).forEach((skill) => textParts.push(asString(skill)));
  });

  asArray(structured.experience).forEach((entry) => {
    const item = asObject(entry);
    textParts.push(asString(item.company_name || item.company), asString(item.job_title || item.role), asString(item.role_scope));
    asArray(item.achievements || item.highlights).forEach((point) => textParts.push(asString(point)));
    asArray(item.tools).forEach((tool) => textParts.push(asString(tool)));
  });

  asArray(structured.projects).forEach((entry) => {
    const item = asObject(entry);
    textParts.push(asString(item.project_name || item.name), asString(item.role), asString(item.project_summary || item.description));
    asArray(item.achievements || item.highlights).forEach((point) => textParts.push(asString(point)));
    asArray(item.tools).forEach((tool) => textParts.push(asString(tool)));
  });

  asArray(structured.education).forEach((entry) => {
    const item = asObject(entry);
    textParts.push(asString(item.school_name || item.school), asString(item.degree), asString(item.major));
    asArray(item.highlights).forEach((point) => textParts.push(asString(point)));
  });

  asArray(structured.awards).forEach((entry) => {
    const item = asObject(entry);
    textParts.push(asString(item.award_name), asString(item.level), asString(item.description));
  });

  return textParts.filter(Boolean).join("\n");
}

function weightedCoverage(
  normalizedResume: string,
  keywords: WeightedKeyword[],
): { coverage: number; matched: WeightedKeyword[]; missing: WeightedKeyword[] } {
  if (keywords.length === 0) return { coverage: 1, matched: [], missing: [] };
  const matched: WeightedKeyword[] = [];
  const missing: WeightedKeyword[] = [];
  keywords.forEach((item) => {
    if (containsTerm(normalizedResume, item.normalized)) matched.push(item);
    else missing.push(item);
  });
  const total = keywords.reduce((sum, item) => sum + item.weight, 0) || 1;
  const covered = matched.reduce((sum, item) => sum + item.weight, 0);
  return { coverage: covered / total, matched, missing };
}

function resumeSignals(rawText: string): ResumeSignals {
  const normalized = normalizeToken(rawText);
  const bulletCount = rawText.match(/^\s*[-*•]\s+/gm)?.length || 0;
  const quantifiedCount = rawText.match(/\d+(?:\.\d+)?\s*(?:%|万|k|K|次|人|条|小时|天|月|年|元)?/g)?.length || 0;
  const actionHits = ACTION_TERMS.filter((term) => containsTerm(normalized, normalizeToken(term))).length;
  const hardHits = [...HARD_SKILL_TERMS].filter((term) => containsTerm(normalized, normalizeToken(term))).length;

  return {
    text: normalized,
    hasContact: /[\w.+-]+@[\w.-]+\.\w+/.test(rawText) || /1[3-9]\d{9}/.test(rawText),
    hasSummary: /个人总结|个人评价|自我评价|summary/i.test(rawText),
    hasSkills: /技能|技术栈|skills/i.test(rawText) || hardHits >= 3,
    hasEducation: /教育|本科|硕士|大学|学院|education/i.test(rawText),
    hasExperience: /实习|工作|经历|公司|experience/i.test(rawText),
    hasProject: /项目|project/i.test(rawText),
    bulletCount,
    quantifiedCount,
    actionHits,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evidenceScore(signals: ResumeSignals): number {
  return clampScore(
    (signals.hasExperience ? 26 : 0) +
      (signals.hasProject ? 18 : 0) +
      Math.min(18, signals.bulletCount * 3) +
      Math.min(22, signals.quantifiedCount * 3) +
      Math.min(16, signals.actionHits * 2),
  );
}

function contentScore(signals: ResumeSignals, rawText: string): number {
  const length = rawText.trim().length;
  return clampScore(
    (signals.hasContact ? 15 : 0) +
      (signals.hasSummary ? 14 : 0) +
      (signals.hasSkills ? 18 : 0) +
      (signals.hasEducation ? 14 : 0) +
      (signals.hasExperience ? 16 : 0) +
      (signals.hasProject ? 12 : 0) +
      (length >= 650 && length <= 2200 ? 11 : length >= 350 ? 6 : 0),
  );
}

function riskFlags(signals: ResumeSignals, hardScore: number, parseScore: number): string[] {
  const flags: string[] = [];
  if (hardScore < 45) flags.push("核心硬技能覆盖不足");
  if (!signals.hasContact) flags.push("联系方式缺失或不可解析");
  if (!signals.hasSkills) flags.push("技能区不清晰");
  if (!signals.hasExperience && !signals.hasProject) flags.push("缺少经历或项目证据");
  if (signals.quantifiedCount === 0) flags.push("缺少量化成果");
  if (parseScore < 55) flags.push("简历结构完整度偏低");
  return flags.slice(0, 5);
}

function buildTip(weakestKey: string, missing: WeightedKeyword[], risks: string[]): string {
  const focusTerms = missing.slice(0, 3).map((item) => item.label).join("、");
  if (weakestKey === "hard") {
    return `优先补齐 ${focusTerms || "JD 中的核心硬技能"}，并把它们写进技能区和项目/经历要点里的真实使用场景。`;
  }
  if (weakestKey === "experience") {
    return "把岗位相关经历写成“动作 + 技术/方法 + 结果”的要点，尽量补充真实数字、规模或交付结果。";
  }
  if (weakestKey === "content") {
    return "先补齐联系方式、教育、技能、经历/项目和个人总结，让 ATS 能稳定解析完整简历结构。";
  }
  if (risks.length > 0) {
    return `当前最大风险是“${risks[0]}”，建议先处理这一项再重新评分。`;
  }
  return "整体匹配度较高，下一步可继续压缩表达并强化与 JD 原词一致的核心技能。";
}

export function calculateATSScore(resumeData: object, jobDescription: string): ATSScoreResult {
  const rawResumeText = flattenResumeData(asObject(resumeData));
  const normalizedResume = normalizeToken(rawResumeText);
  const keywords = extractKeywords(jobDescription);

  if (!normalizedResume.trim() || !jobDescription.trim()) {
    return {
      overallScore: 0,
      matchedKeywords: [],
      missingKeywords: keywords.slice(0, 10).map((item) => item.label),
      improvementTip: "请先补充岗位 JD 和可评分的简历正文。",
      mode: "insufficient_input",
      semanticSimilarity: 0,
      keywordCoverage: 0,
      provider: "local_enterprise_rules",
      scoreBreakdown: [],
      riskFlags: ["输入不足"],
      scoringVersion: "enterprise-ats-v2-local",
    };
  }

  const hardKeywords = keywords.filter((item) => item.category === "hard");
  const softKeywords = keywords.filter((item) => item.category === "soft");
  const experienceKeywords = keywords.filter((item) => item.category === "experience");
  const allCoverage = weightedCoverage(normalizedResume, keywords);
  const hardCoverage = weightedCoverage(normalizedResume, hardKeywords);
  const softCoverage = weightedCoverage(normalizedResume, softKeywords);
  const experienceCoverage = weightedCoverage(normalizedResume, experienceKeywords);

  const signals = resumeSignals(rawResumeText);
  const hardScore = clampScore(hardCoverage.coverage * 100);
  const roleScore = clampScore((experienceCoverage.coverage * 0.72 + softCoverage.coverage * 0.28) * 100);
  const expScore = evidenceScore(signals);
  const parseScore = contentScore(signals, rawResumeText);
  let overallScore = clampScore(hardScore * 0.48 + roleScore * 0.18 + expScore * 0.18 + parseScore * 0.16);

  if (hardKeywords.length > 0 && hardScore < 35) overallScore = Math.min(overallScore, 68);
  if (!signals.hasExperience && !signals.hasProject) overallScore = Math.min(overallScore, 64);
  if (parseScore < 45) overallScore = Math.min(overallScore, 72);

  const scoreBreakdown = [
    { key: "hard", label: "JD 硬技能覆盖", score: hardScore, weight: 0.48 },
    { key: "role", label: "岗位语境匹配", score: roleScore, weight: 0.18 },
    { key: "experience", label: "经历证据强度", score: expScore, weight: 0.18 },
    { key: "content", label: "ATS 可解析完整度", score: parseScore, weight: 0.16 },
  ];
  const weakest = [...scoreBreakdown].sort((left, right) => left.score - right.score)[0];
  const risks = riskFlags(signals, hardScore, parseScore);

  return {
    overallScore,
    matchedKeywords: allCoverage.matched.slice(0, 10).map((item) => item.label),
    missingKeywords: allCoverage.missing.slice(0, 10).map((item) => item.label),
    improvementTip: buildTip(weakest?.key || "hard", allCoverage.missing, risks),
    mode: "enterprise_rules",
    semanticSimilarity: Number(allCoverage.coverage.toFixed(4)),
    keywordCoverage: Number(allCoverage.coverage.toFixed(4)),
    provider: "local_enterprise_rules",
    model: "",
    scoreBreakdown,
    riskFlags: risks,
    scoringVersion: "enterprise-ats-v2-local",
  };
}
