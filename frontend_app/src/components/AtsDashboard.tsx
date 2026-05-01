import React from "react";
import { motion, AnimatePresence } from "framer-motion";

import type { ATSScoreResult } from "../lib/ats-scorer";

type AtsDashboardMeta = {
  scoreModeLabel?: string;
  providerLabel?: string;
  semanticSimilarity?: number | null;
  keywordCoverage?: number | null;
  ragHitCount?: number;
  ragModeLabel?: string;
  warning?: string;
};

type AtsDashboardProps = {
  result: ATSScoreResult | null;
  meta?: AtsDashboardMeta | null;
  isStreaming?: boolean;
  emptyStateCopy?: string;
};

function formatWeight(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return `${Math.round(value * 100)}%`;
}

function getScoreTone(score: number) {
  if (score >= 81) {
    return {
      label: "匹配度较高",
      themeClass: "is-strong",
      summary: "当前简历已经覆盖岗位的大部分核心要求，可以继续补强细节与量化成果。",
    };
  }

  if (score >= 70) {
    return {
      label: "基本匹配",
      themeClass: "is-balanced",
      summary: "整体方向已经对齐，但仍建议补充关键技能、项目结果和岗位措辞。",
    };
  }

  return {
    label: "需要补强",
    themeClass: "is-warning",
    summary: "当前仍有较多高权重缺口，建议先补齐关键词和经验证据，再继续投递。",
  };
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function MetricItem({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="ats-dashboard__meta-item">
      <p className="ats-dashboard__panel-title">{label}</p>
      <strong>{value}</strong>
      <span>{hint}</span>
    </div>
  );
}

function KeywordGroup({
  title,
  keywords,
  chipClass,
  emptyLabel,
  panelClassName = "",
}: {
  title: string;
  keywords: string[];
  chipClass: string;
  emptyLabel: string;
  panelClassName?: string;
}) {
  return (
    <section className={`ats-dashboard__panel ${panelClassName}`}>
      <div className="ats-dashboard__panel-head">
        <p className="ats-dashboard__panel-title">{title}</p>
        <motion.span
          key={keywords.length}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="chip"
        >
          {keywords.length}
        </motion.span>
      </div>
      <div className="ats-dashboard__chips">
        <AnimatePresence mode="popLayout">
          {keywords.length > 0 ? (
            keywords.map((keyword, index) => (
              <motion.span
                key={keyword}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`chip ${chipClass}`}
              >
                {keyword}
              </motion.span>
            ))
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="chip"
            >
              {emptyLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default function AtsDashboard({
  result,
  meta = null,
  isStreaming = false,
  emptyStateCopy = "等待 ATS 评分结果。",
}: AtsDashboardProps) {
  const score = result?.overallScore ?? 0;
  const tone = getScoreTone(score);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <section
      className={`paper-panel ats-dashboard p-6 lg:p-7 ${tone.themeClass} ${
        isStreaming ? "is-streaming" : ""
      }`}
    >
      <div className="ats-dashboard__header">
        <div>
          <p className="ats-dashboard__eyebrow">ATS 仪表盘</p>
          <h2 className="ats-dashboard__title">岗位匹配数据摘要</h2>
          <p className="ats-dashboard__copy">{result ? tone.summary : emptyStateCopy}</p>
        </div>
        <div className="ats-dashboard__status">
          <span className={`chip ${isStreaming ? "accent-chip" : ""}`}>
            {isStreaming ? "实时刷新中" : "已就绪"}
          </span>
          {result ? <span className="chip">{tone.label}</span> : null}
        </div>
      </div>

      {meta ? (
        <div className="ats-dashboard__meta-grid">
          <MetricItem
            label="评分模式"
            value={meta.scoreModeLabel || "本地规则"}
            hint={meta.providerLabel || "local"}
          />
          <MetricItem
            label="语义相似度"
            value={formatPercent(meta.semanticSimilarity)}
            hint="向量语义相关度"
          />
          <MetricItem
            label="关键词覆盖率"
            value={formatPercent(meta.keywordCoverage)}
            hint="JD 关键词命中情况"
          />
          <MetricItem
            label="参考库命中"
            value={meta.ragHitCount ?? 0}
            hint={meta.ragModeLabel || "待检索"}
          />
        </div>
      ) : null}

      {meta?.warning ? <p className="ats-dashboard__warning">{meta.warning}</p> : null}

      {result?.scoreBreakdown?.length ? (
        <div className="ats-dashboard__breakdown" aria-label="ATS 评分维度">
          {result.scoreBreakdown.map((item) => (
            <div key={item.key} className="ats-dashboard__breakdown-item">
              <div className="ats-dashboard__breakdown-head">
                <span>{item.label}</span>
                <strong>{Math.round(item.score)}</strong>
              </div>
              <div className="ats-dashboard__breakdown-track" aria-hidden="true">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
              <p>权重 {formatWeight(item.weight)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {result?.riskFlags?.length ? (
        <div className="ats-dashboard__risk-row">
          {result.riskFlags.slice(0, 4).map((flag) => (
            <span key={flag} className="chip chip--negative">
              {flag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="ats-dashboard__grid">
        <section className="ats-dashboard__score-panel">
          <div className="ats-dashboard__orb" aria-hidden="true">
            <svg viewBox="0 0 140 140" className="ats-dashboard__orb-svg">
              <circle className="ats-dashboard__orb-track" cx="70" cy="70" r={radius} />
              <motion.circle
                className="ats-dashboard__orb-progress"
                cx="70"
                cy="70"
                r={radius}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <motion.div
              className="ats-dashboard__orb-copy"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.strong
                key={score}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {result ? score : "--"}
              </motion.strong>
              <span>{result ? "/ 100" : "等待评分"}</span>
            </motion.div>
          </div>

          <div className="ats-dashboard__score-copy">
            <p className="ats-dashboard__panel-title">综合分数</p>
            <h3>{result ? tone.label : "评分待生成"}</h3>
            <p>
              {result
                ? "分数会随着 JD、原始简历、流式生成结果和手动改写实时刷新。"
                : emptyStateCopy}
            </p>
          </div>
        </section>

        <section className="ats-dashboard__panel ats-dashboard__panel--tip">
          <div className="ats-dashboard__panel-head">
            <p className="ats-dashboard__panel-title">优先改进建议</p>
            <span className="chip">{result ? "1 条" : "--"}</span>
          </div>
          <p className="ats-dashboard__tip">
            {result
              ? result.improvementTip
              : "补齐岗位 JD 或生成简历草稿后，这里会给出一句最优先的改进建议。"}
          </p>
        </section>

        <KeywordGroup
          title="已命中关键词"
          keywords={result?.matchedKeywords || []}
          chipClass="chip--positive"
          emptyLabel="暂无命中词"
          panelClassName="ats-dashboard__panel--matched"
        />

        <KeywordGroup
          title="缺失关键词"
          keywords={result?.missingKeywords || []}
          chipClass="chip--negative"
          emptyLabel="暂无高权重缺失词"
          panelClassName="ats-dashboard__panel--missing"
        />
      </div>
    </section>
  );
}
