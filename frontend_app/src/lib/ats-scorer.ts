import similarityModule from "string-similarity";

export type ATSScoreResult = {
  overallScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  improvementTip: string;
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
  tokens: string[];
  summaryPresent: boolean;
  skillsPresent: boolean;
  experienceCount: number;
  projectCount: number;
  educationCount: number;
  bulletCount: number;
  quantifiedBulletCount: number;
  actionWordHits: number;
  hardTermCount: number;
};

const similarityApi =
  similarityModule && typeof similarityModule === "object"
    ? similarityModule
    : { compareTwoStrings: () => 0 };

const compareTwoStrings =
  typeof similarityApi.compareTwoStrings === "function"
    ? similarityApi.compareTwoStrings.bind(similarityApi)
    : () => 0;

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
  "plus",
  "ability",
  "experience",
  "years",
  "year",
  "work",
  "working",
  "related",
  "preferred",
  "required",
  "requirements",
  "candidate",
  "role",
  "position",
  "job",
  "team",
  "must",
  "should",
  "can",
  "will",
  "good",
  "strong",
  "具备",
  "熟悉",
  "掌握",
  "了解",
  "参与",
  "负责",
  "能够",
  "相关",
  "优先",
  "以上",
  "以及",
  "我们",
  "你将",
  "岗位",
  "职位",
  "要求",
  "能力",
  "经验",
  "年以上",
  "有",
  "和",
  "及",
  "或",
  "对",
  "等",
  "者",
  "中",
  "的",
  "并",
  "良好",
  "优秀",
  "一定",
  "至少",
]);

const ALIAS_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  nodejs: "node.js",
  node: "node.js",
  reactjs: "react",
  vuejs: "vue",
  nextjs: "next.js",
  nestjs: "nest.js",
  expressjs: "express",
  rest: "rest api",
  restful: "rest api",
  restfulapi: "rest api",
  api: "api",
  golang: "go",
  k8s: "kubernetes",
  awscloud: "aws",
  gcpcloud: "gcp",
  ai: "artificial intelligence",
  ml: "machine learning",
  dl: "deep learning",
  nlp: "nlp",
  llm: "llm",
  ownership: "ownership",
  problemsolving: "problem solving",
  crossfunctional: "cross functional",
  crossteam: "cross functional",
  communication: "communication",
  collaboration: "collaboration",
};

const SAFE_SHORT_ENGLISH_TERMS = new Set(["bi", "go", "qa", "ui", "ux"]);

const HARD_SKILL_TERMS = [
  "python",
  "java",
  "javascript",
  "typescript",
  "react",
  "vue",
  "angular",
  "next.js",
  "node.js",
  "express",
  "nest.js",
  "go",
  "rust",
  "c++",
  "c#",
  "php",
  "swift",
  "kotlin",
  "html",
  "css",
  "tailwind",
  "sass",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "sql",
  "graphql",
  "rest api",
  "grpc",
  "fastapi",
  "django",
  "flask",
  "spring",
  "spring boot",
  "docker",
  "kubernetes",
  "linux",
  "git",
  "ci/cd",
  "microservices",
  "aws",
  "azure",
  "gcp",
  "pandas",
  "numpy",
  "spark",
  "airflow",
  "tensorflow",
  "pytorch",
  "machine learning",
  "deep learning",
  "nlp",
  "llm",
  "rag",
  "data analysis",
  "data visualization",
  "tableau",
  "power bi",
  "performance optimization",
  "system design",
  "api design",
  "unit testing",
  "automation testing",
  "测试自动化",
  "性能优化",
  "接口设计",
  "系统设计",
  "分布式",
  "微服务",
  "数据分析",
  "数据可视化",
  "机器学习",
  "深度学习",
  "自然语言处理",
  "大模型",
  "算法",
  "数据结构",
  "云原生",
  "后端开发",
  "前端开发",
  "全栈开发",
];

const SOFT_SKILL_TERMS = [
  "communication",
  "collaboration",
  "teamwork",
  "leadership",
  "ownership",
  "problem solving",
  "stakeholder management",
  "mentoring",
  "learning",
  "adaptability",
  "initiative",
  "detail oriented",
  "time management",
  "cross functional",
  "沟通",
  "协作",
  "团队合作",
  "领导力",
  "责任心",
  "自驱",
  "主动性",
  "学习能力",
  "问题解决",
  "推动",
  "跨团队",
  "细节",
  "抗压",
];

const EXPERIENCE_TERMS = [
  "backend",
  "back end",
  "frontend",
  "front end",
  "full stack",
  "devops",
  "sre",
  "qa",
  "test automation",
  "data engineer",
  "data analyst",
  "data scientist",
  "machine learning engineer",
  "product manager",
  "mobile",
  "ios",
  "android",
  "增长",
  "运营",
  "产品",
  "数据科学",
  "数据分析师",
  "数据工程",
  "后端",
  "前端",
  "全栈",
  "测试",
  "运维",
  "算法工程师",
  "客户端",
  "设计",
  "开发",
  "优化",
  "推进",
  "构建",
  "实现",
  "交付",
  "维护",
  "重构",
  "分析",
  "上线",
  "落地",
  "增长",
  "design",
  "develop",
  "optimize",
  "deliver",
  "build",
  "launch",
  "maintain",
  "refactor",
  "analyze",
  "lead",
];

const ALL_KNOWN_TERMS = Array.from(
  new Set([...HARD_SKILL_TERMS, ...SOFT_SKILL_TERMS, ...EXPERIENCE_TERMS]),
).map((term) => normalizeKeyword(term));

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
  return /[\u4e00-\u9fff]/.test(value);
}

function countOccurrences(text: string, keyword: string): number {
  if (!text || !keyword) return 0;

  if (!hasCjk(keyword) && /^[a-z0-9.+#/\s-]+$/.test(keyword)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`(^|[^a-z0-9+#.])${escaped}(?=$|[^a-z0-9+#.])`, "g");
    return text.match(matcher)?.length || 0;
  }

  let count = 0;
  let cursor = 0;

  while (cursor >= 0) {
    cursor = text.indexOf(keyword, cursor);
    if (cursor === -1) break;
    count += 1;
    cursor += keyword.length;
  }

  return count;
}

function normalizeKeyword(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[()（）[\]{}]/g, " ")
    .replace(/[，。；：、|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";
  const compact = normalized.replace(/\s+/g, "");
  return ALIAS_MAP[compact] || ALIAS_MAP[normalized] || normalized;
}

function toDisplayLabel(keyword: string): string {
  if (!keyword) return "";
  if (hasCjk(keyword)) return keyword;
  if (keyword === "rest api") return "REST API";
  if (keyword === "node.js") return "Node.js";
  if (keyword === "next.js") return "Next.js";
  if (keyword === "nest.js") return "Nest.js";
  if (keyword === "ci/cd") return "CI/CD";
  if (keyword === "aws") return "AWS";
  if (keyword === "gcp") return "GCP";
  if (keyword === "nlp") return "NLP";
  if (keyword === "llm") return "LLM";
  if (keyword === "rag") return "RAG";
  return keyword
    .split(" ")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function extractEnglishTokens(text: string): string[] {
  return text.match(/[a-z][a-z0-9.+#/-]{1,}/g) || [];
}

function cleanChineseFragment(fragment: string): string {
  return fragment
    .replace(/(熟悉|掌握|负责|具备|了解|参与|推动|能够|需要|优先|擅长|良好|完成|支持|相关|使用)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractChineseFragments(text: string): string[] {
  return text
    .split(/[\n,，。；;：:、/|]/)
    .map((fragment) => cleanChineseFragment(fragment))
    .flatMap((fragment) => fragment.split(/\s+/))
    .map((fragment) => fragment.trim())
    .filter((fragment) => hasCjk(fragment) && fragment.length >= 2 && fragment.length <= 10);
}

function inferCategory(keyword: string): KeywordCategory {
  if (HARD_SKILL_TERMS.map(normalizeKeyword).includes(keyword)) return "hard";
  if (SOFT_SKILL_TERMS.map(normalizeKeyword).includes(keyword)) return "soft";
  if (EXPERIENCE_TERMS.map(normalizeKeyword).includes(keyword)) return "experience";
  if (/[.+#]/.test(keyword) || /\d/.test(keyword)) return "hard";
  return "general";
}

function isAmbiguousShortEnglishKeyword(keyword: string): boolean {
  if (!keyword || hasCjk(keyword)) return false;
  if (!/^[a-z]+$/.test(keyword)) return false;
  return keyword.length === 2 && !SAFE_SHORT_ENGLISH_TERMS.has(keyword);
}

function isNoiseKeyword(keyword: string): boolean {
  if (!keyword) return true;
  if (STOP_WORDS.has(keyword)) return true;
  if (isAmbiguousShortEnglishKeyword(keyword)) return true;
  if (!hasCjk(keyword) && keyword.length < 2) return true;
  if (hasCjk(keyword) && keyword.length < 2) return true;
  return false;
}

function pickReadableKeywords(keywords: string[], limit = 8): string[] {
  return keywords
    .filter((keyword) => !isAmbiguousShortEnglishKeyword(normalizeKeyword(keyword)))
    .slice(0, limit);
}

function addWeightedKeyword(
  map: Map<string, WeightedKeyword>,
  label: string,
  category: KeywordCategory,
  weight: number,
) {
  const normalized = normalizeKeyword(label);
  if (!normalized || isNoiseKeyword(normalized)) return;

  const existing = map.get(normalized);
  const nextWeight = Number.isFinite(weight) ? weight : 0;

  if (existing) {
    existing.weight += nextWeight;
    if (existing.category === "general" && category !== "general") {
      existing.category = category;
      existing.label = toDisplayLabel(normalized);
    }
    return;
  }

  map.set(normalized, {
    label: toDisplayLabel(normalized),
    normalized,
    category,
    weight: nextWeight,
  });
}

function buildWeightedKeywords(jobDescription: string): WeightedKeyword[] {
  const normalizedText = normalizeKeyword(jobDescription);
  if (!normalizedText) return [];

  const lines = jobDescription
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const map = new Map<string, WeightedKeyword>();

  lines.forEach((line, index) => {
    const normalizedLine = normalizeKeyword(line);
    const lineBoost = index === 0 ? 1 : index < 3 ? 0.5 : 0;
    const listBoost = /^[-*•\d]/.test(line) ? 0.35 : 0;
    const tokens = [...extractEnglishTokens(normalizedLine), ...extractChineseFragments(line)];

    tokens.forEach((token) => {
      const normalized = normalizeKeyword(token);
      if (!normalized || isNoiseKeyword(normalized)) return;
      const frequency = countOccurrences(normalizedText, normalized);
      const category = inferCategory(normalized);
      const categoryBoost =
        category === "hard" ? 0.65 : category === "soft" ? 0.35 : category === "experience" ? 0.45 : 0.1;
      const lengthBoost = hasCjk(normalized)
        ? Math.min(0.45, normalized.length * 0.06)
        : Math.min(0.55, normalized.length * 0.03);
      addWeightedKeyword(
        map,
        normalized,
        category,
        1 + lineBoost + listBoost + categoryBoost + lengthBoost + Math.max(0, frequency - 1) * 0.55,
      );
    });
  });

  ALL_KNOWN_TERMS.forEach((term) => {
    const occurrences = countOccurrences(normalizedText, term);
    if (!occurrences) return;
    const category = inferCategory(term);
    addWeightedKeyword(
      map,
      term,
      category,
      1.2 + occurrences * 0.7 + (category === "hard" ? 0.8 : category === "soft" ? 0.5 : 0.55),
    );
  });

  return Array.from(map.values())
    .filter((item) => item.weight > 0)
    .sort((left, right) => right.weight - left.weight);
}

function flattenResumeData(resumeData: Record<string, any>): ResumeSignals {
  const candidate = asObject(resumeData);
  const structured = asObject(candidate.structured_resume || candidate.structuredResume || candidate);
  const contact = asObject(structured.contact);
  const summary = asString(structured.summary);
  const experience = asArray(structured.experience).map(asObject);
  const projects = asArray(structured.projects).map(asObject);
  const education = asArray(structured.education).map(asObject);
  const skills = asArray(structured.skills).map(asObject);
  const resumeText = asString(candidate.resume_text || candidate.resumeText);

  const textParts: string[] = [
    asString(contact.full_name),
    asString(contact.target_role),
    asString(contact.target_company),
    summary,
    resumeText,
  ];

  skills.forEach((group) => {
    textParts.push(asString(group.category));
    asArray(group.items).forEach((item) => textParts.push(asString(item)));
  });

  experience.forEach((item) => {
    textParts.push(
      asString(item.company_name || item.company),
      asString(item.job_title || item.role),
      asString(item.role_scope),
    );
    asArray(item.achievements || item.highlights).forEach((point) => textParts.push(asString(point)));
    asArray(item.tools).forEach((tool) => textParts.push(asString(tool)));
  });

  projects.forEach((item) => {
    textParts.push(
      asString(item.project_name || item.name),
      asString(item.role),
      asString(item.project_summary || item.description),
    );
    asArray(item.achievements || item.highlights).forEach((point) => textParts.push(asString(point)));
    asArray(item.tools).forEach((tool) => textParts.push(asString(tool)));
  });

  education.forEach((item) => {
    textParts.push(asString(item.school_name || item.school), asString(item.degree), asString(item.major));
    asArray(item.highlights).forEach((point) => textParts.push(asString(point)));
  });

  const text = normalizeKeyword(textParts.filter(Boolean).join("\n"));
  const extracted = new Set<string>();

  extractEnglishTokens(text).forEach((token) => extracted.add(normalizeKeyword(token)));
  extractChineseFragments(text).forEach((token) => extracted.add(normalizeKeyword(token)));
  ALL_KNOWN_TERMS.forEach((term) => {
    if (countOccurrences(text, term) > 0) {
      extracted.add(term);
    }
  });

  const bulletCount =
    experience.reduce((count, item) => count + asArray(item.achievements || item.highlights).length, 0) +
    projects.reduce((count, item) => count + asArray(item.achievements || item.highlights).length, 0) +
    education.reduce((count, item) => count + asArray(item.highlights).length, 0) +
    (resumeText.match(/^\s*[-*•]\s+/gm)?.length || 0);
  const quantifiedBulletCount = (resumeText.match(/\d+[%+x万元kK]?/g)?.length || 0) +
    experience.reduce((count, item) => {
      const lineText = asArray(item.achievements || item.highlights).join(" ");
      return count + (lineText.match(/\d+[%+x万元kK]?/g)?.length || 0);
    }, 0) +
    projects.reduce((count, item) => {
      const lineText = asArray(item.achievements || item.highlights).join(" ");
      return count + (lineText.match(/\d+[%+x万元kK]?/g)?.length || 0);
    }, 0);
  const actionWordHits = EXPERIENCE_TERMS.filter((term) => countOccurrences(text, normalizeKeyword(term)) > 0)
    .length;
  const hardTermCount = HARD_SKILL_TERMS.filter((term) => countOccurrences(text, normalizeKeyword(term)) > 0).length;

  return {
    text,
    tokens: Array.from(extracted).filter(Boolean),
    summaryPresent: Boolean(summary.trim()),
    skillsPresent: skills.length > 0 || hardTermCount >= 3,
    experienceCount: experience.length,
    projectCount: projects.length,
    educationCount: education.length,
    bulletCount,
    quantifiedBulletCount,
    actionWordHits,
    hardTermCount,
  };
}

function exactMatch(text: string, tokenSet: Set<string>, keyword: string): boolean {
  if (!keyword) return false;
  if (tokenSet.has(keyword)) return true;
  if (!hasCjk(keyword) && /^[a-z0-9.+#/\s-]+$/.test(keyword)) {
    return countOccurrences(text, keyword) > 0;
  }
  return text.includes(keyword);
}

function fuzzyMatch(tokens: string[], keyword: string): boolean {
  if (!keyword || tokens.length === 0) return false;

  const threshold = !hasCjk(keyword) && keyword.replace(/[^a-z]/g, "").length <= 4 ? 0.84 : 0.72;
  const compactKeyword = keyword.replace(/\s+/g, "");

  return tokens.some((token) => {
    if (hasCjk(keyword) !== hasCjk(token)) return false;
    if (Math.abs(token.length - keyword.length) > Math.max(6, keyword.length)) return false;

    const normalizedToken = token.replace(/\s+/g, "");
    if (compactKeyword && normalizedToken.includes(compactKeyword)) return true;

    return compareTwoStrings(keyword, token) >= threshold;
  });
}

function matchesKeyword(signals: ResumeSignals, keyword: string): boolean {
  const tokenSet = new Set(signals.tokens);
  if (exactMatch(signals.text, tokenSet, keyword)) return true;
  return fuzzyMatch(signals.tokens, keyword);
}

function coverageScore(keywords: WeightedKeyword[], signals: ResumeSignals): number {
  if (keywords.length === 0) return 100;
  const totalWeight = keywords.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return 100;
  const matchedWeight = keywords.reduce(
    (sum, item) => sum + (matchesKeyword(signals, item.normalized) ? item.weight : 0),
    0,
  );
  return Math.round((matchedWeight / totalWeight) * 100);
}

function calculateExperienceScore(keywords: WeightedKeyword[], signals: ResumeSignals): number {
  if (keywords.length === 0) return 100;
  const coverage = coverageScore(keywords, signals);
  const evidenceBonus =
    (signals.experienceCount > 0 ? 8 : 0) +
    (signals.projectCount > 0 ? 6 : 0) +
    (signals.quantifiedBulletCount > 0 ? 8 : 0) +
    Math.min(8, signals.actionWordHits * 1.5);

  return Math.min(100, Math.round(coverage * 0.82 + evidenceBonus));
}

function calculateRichnessScore(signals: ResumeSignals): number {
  const score =
    (signals.summaryPresent ? 15 : 0) +
    (signals.skillsPresent ? 20 : 0) +
    (signals.experienceCount > 0 ? 20 : 0) +
    (signals.projectCount > 0 ? 12 : 0) +
    (signals.educationCount > 0 ? 10 : 0) +
    (signals.quantifiedBulletCount > 0 ? 13 : 0) +
    (signals.bulletCount >= 4 ? 10 : signals.bulletCount >= 2 ? 6 : 0);

  return Math.min(100, Math.round(score));
}

function uniqueTopKeywords(keywords: WeightedKeyword[], signals: ResumeSignals, matched: boolean): string[] {
  const seen = new Set<string>();
  const selected: string[] = [];

  for (const item of keywords) {
    if (item.category === "general") continue;
    const isMatch = matchesKeyword(signals, item.normalized);
    if (isMatch !== matched) continue;
    if (seen.has(item.label)) continue;

    seen.add(item.label);
    selected.push(item.label);

    if (selected.length >= 8) break;
  }

  return selected;
}

function buildImprovementTip(
  weakestDimension: "hard" | "soft" | "experience" | "richness",
  missingKeywords: string[],
): string {
  const focusTerms = pickReadableKeywords(missingKeywords, 3).join("、");

  if (weakestDimension === "hard") {
    return focusTerms
      ? `优先补强 ${focusTerms} 这类硬技能关键词，并在技能或项目经历里写出实际使用场景。`
      : "优先补强岗位硬技能，并在技能或项目经历里写出实际使用场景。";
  }

  if (weakestDimension === "soft") {
    return focusTerms
      ? `补充 ${focusTerms} 等软技能表达，尽量落在协作、推进和结果影响的具体场景里。`
      : "补充软技能表达，尽量落在协作、推进和结果影响的具体场景里。";
  }

  if (weakestDimension === "experience") {
    return focusTerms
      ? `围绕 ${focusTerms} 调整经历描述，并补上动作词和量化结果，让岗位相关性更清晰。`
      : "围绕目标岗位重写经历描述，并补上动作词和量化结果，让岗位相关性更清晰。";
  }

  return "补充个人总结、技能分组，以及项目或经历要点，并加入量化结果，让 ATS 更容易抓到重点。";
}

export function calculateATSScore(resumeData: object, jobDescription: string): ATSScoreResult {
  const weightedKeywords = buildWeightedKeywords(jobDescription);
  const signals = flattenResumeData(asObject(resumeData));

  if (!signals.text.trim()) {
    return {
      overallScore: 0,
      matchedKeywords: [],
      missingKeywords: weightedKeywords
        .filter((item) => !isAmbiguousShortEnglishKeyword(item.normalized))
        .slice(0, 8)
        .map((item) => item.label),
      improvementTip: "先提供可评分的简历内容，再根据缺失关键词逐步补全技能、经历和量化结果。",
    };
  }

  const hardKeywords = weightedKeywords.filter((item) => item.category === "hard");
  const softKeywords = weightedKeywords.filter((item) => item.category === "soft");
  const experienceKeywords = weightedKeywords.filter((item) => item.category === "experience");

  const hardScore = coverageScore(hardKeywords, signals);
  const softScore = coverageScore(softKeywords, signals);
  const experienceScore = calculateExperienceScore(experienceKeywords, signals);
  const richnessScore = calculateRichnessScore(signals);

  const overallScore = Math.round(
    hardScore * 0.5 + softScore * 0.2 + experienceScore * 0.2 + richnessScore * 0.1,
  );

  const matchedKeywords = uniqueTopKeywords(weightedKeywords, signals, true);
  const missingKeywords = uniqueTopKeywords(weightedKeywords, signals, false);
  const dimensionScores = [
    { key: "hard" as const, score: hardScore },
    { key: "soft" as const, score: softScore },
    { key: "experience" as const, score: experienceScore },
    { key: "richness" as const, score: richnessScore },
  ].sort((left, right) => left.score - right.score);

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    matchedKeywords,
    missingKeywords,
    improvementTip: buildImprovementTip(dimensionScores[0]?.key || "hard", missingKeywords),
  };
}
