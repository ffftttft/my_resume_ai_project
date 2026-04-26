import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  Search,
  Sparkles,
  ShieldCheck,
  Target,
} from "lucide-react";
import RippleButton from "./RippleButton";

const STEP_META = {
  search: {
    title: "联网检索岗位信息",
    icon: Search,
  },
  synthesize: {
    title: "提炼岗位关键词",
    icon: Target,
  },
  draft: {
    title: "生成或优化简历",
    icon: Sparkles,
  },
  validate: {
    title: "校验结构化结果",
    icon: ShieldCheck,
  },
  score: {
    title: "计算 ATS 与完成情况",
    icon: CircleDashed,
  },
  complete: {
    title: "结果落地工作台",
    icon: CheckCircle2,
  },
};

const STEP_ORDER = ["search", "synthesize", "draft", "validate", "score", "complete"];

function getStepState(stepIndex, currentStep, isStreaming) {
  if (!currentStep) return "pending";
  if (stepIndex < currentStep) return "done";
  if (stepIndex === currentStep) return isStreaming ? "active" : "done";
  return "pending";
}

export default function AiProgressTimeline({
  status = "",
  phase = "",
  step = 0,
  totalSteps = 6,
  meta = null,
  isStreaming = false,
  activities = [],
  jobInsight = null,
  onRefreshJobContext,
  onOpenSources,
  onJumpToField,
  refreshingJobContext = false,
  streamError = "",
  contractWarning = "",
}) {
  const activeStep = typeof step === "number" && step > 0 ? step : 0;
  const results = Array.isArray(jobInsight?.results) ? jobInsight.results : [];
  const hasInsightPayload = Boolean(jobInsight?.query || results.length || jobInsight?.warning);
  const modeLabel =
    jobInsight?.mode === "network"
      ? "已联网"
      : jobInsight?.mode === "cached"
        ? "缓存命中"
        : jobInsight?.mode === "disabled"
          ? "未启用联网"
          : jobInsight?.mode === "empty"
            ? "未命中来源"
            : jobInsight?.mode === "error"
              ? "搜索异常"
              : "待搜索";
  const insightText = results.length
    ? `已命中 ${results.length} 条岗位来源，默认只围绕公司和岗位检索。`
    : jobInsight?.warning || "当前没有可用的联网岗位情报，将仅基于用户填写的 JD 继续执行。";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`atelier-panel ai-progress-card rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${
        isStreaming ? "is-streaming" : ""
      }`}
    >
      <div className="ai-progress-card__header">
        <div className="min-w-0">
          <p className="ai-progress-card__eyebrow">AI 进度</p>
          <h3 className="ai-progress-card__title">当前执行步骤</h3>
          <p className="ai-progress-card__copy">
            {status || "还没有开始执行，启动生成或优化后，这里会显示 AI 当前做到哪一步。"}
          </p>
        </div>
        <div className="ai-progress-card__actions">
          <motion.span
            key={`${activeStep}-${totalSteps}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`chip ${isStreaming ? "accent-chip" : ""}`}
          >
            {activeStep > 0 ? `${Math.min(activeStep, totalSteps)} / ${totalSteps}` : "待开始"}
          </motion.span>
          <RippleButton
            onClick={onRefreshJobContext}
            disabled={refreshingJobContext}
            variant="secondary"
            size="sm"
          >
            {refreshingJobContext ? "刷新中..." : "刷新岗位情报"}
          </RippleButton>
          <RippleButton
            onClick={onOpenSources}
            disabled={!hasInsightPayload}
            variant="secondary"
            size="sm"
          >
            查看来源
          </RippleButton>
        </div>
      </div>

      <div className="ai-progress-card__timeline">
        {STEP_ORDER.map((stepKey, index) => {
          const stepIndex = index + 1;
          const stepState = getStepState(stepIndex, activeStep, isStreaming);
          const Icon = STEP_META[stepKey].icon;
          const isCurrentPhase = phase === stepKey;
          return (
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`ai-progress-card__step is-${stepState} ${isCurrentPhase ? "is-current" : ""}`}
            >
              <motion.div
                className="ai-progress-card__step-icon"
                animate={
                  stepState === "active"
                    ? {
                        scale: [1, 1.15, 1],
                        opacity: [1, 0.7, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                          "0 0 0 8px rgba(59, 130, 246, 0.2)",
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: stepState === "active" ? Infinity : 0,
                  ease: "easeInOut",
                }}
                style={{
                  borderRadius: "50%",
                }}
              >
                {stepState === "active" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <motion.div
                    initial={stepState === "done" ? { scale: 0 } : {}}
                    animate={stepState === "done" ? { scale: 1 } : {}}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <Icon size={16} />
                  </motion.div>
                )}
              </motion.div>
              <div className="ai-progress-card__step-copy">
                <strong>{STEP_META[stepKey].title}</strong>
                <span>{stepState === "done" ? "已完成" : stepState === "active" ? "进行中" : "等待执行"}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activities.length > 0 ? (
          <motion.div
            key="activities"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ai-progress-card__activity-list"
          >
            {activities.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="stream-activity-item"
              >
                <motion.div
                  className="stream-activity-item__dot"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="min-w-0">
                  <p className="stream-activity-item__label">{item.label}</p>
                  <p className="stream-activity-item__detail">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="ai-progress-card__footer"
      >
        <div className="ai-progress-card__insight">
          <p className="ai-progress-card__insight-title">岗位情报</p>
          <div className="ai-progress-card__insight-pills">
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="ai-progress-card__pill"
            >
              {jobInsight?.provider || "Tavily"}
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="ai-progress-card__pill"
            >
              {modeLabel}
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="ai-progress-card__pill"
            >
              {jobInsight?.cached ? "缓存" : "实时"}
            </motion.span>
          </div>
          <p className="ai-progress-card__insight-text">{insightText}</p>
          {jobInsight?.query ? (
            <p className="ai-progress-card__insight-query" title={jobInsight.query}>
              Query: {jobInsight.query}
            </p>
          ) : null}
        </div>
      </motion.div>

      {/* 错误和警告信息 - 统一显示所有错误 */}
      <AnimatePresence>
        {(() => {
          const allErrors = [
            meta?.warning,
            jobInsight?.warning,
            streamError,
            contractWarning,
          ].filter(Boolean);

          // 检测是否是字段验证错误并提取字段名
          const parseFieldError = (errorText) => {
            const fieldPatterns = [
              { pattern: /出生日期/, field: "birth_date", label: "出生日期" },
              { pattern: /开始时间|开始日期/, field: "start_date", label: "开始时间" },
              { pattern: /结束时间|结束日期/, field: "end_date", label: "结束时间" },
              { pattern: /目标公司/, field: "target_company", label: "目标公司" },
              { pattern: /目标岗位/, field: "target_role", label: "目标岗位" },
              { pattern: /岗位要求/, field: "job_requirements", label: "岗位要求" },
              { pattern: /邮箱/, field: "email", label: "邮箱" },
              { pattern: /电话/, field: "phone", label: "电话" },
              { pattern: /姓名/, field: "full_name", label: "姓名" },
            ];

            for (const { pattern, field, label } of fieldPatterns) {
              if (pattern.test(errorText)) {
                return { field, label };
              }
            }
            return null;
          };

          const scrollToField = (fieldName) => {
            // 直接通过 name 属性查找
            const element = document.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);

            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => {
                element.focus();
                if (element.select) element.select();
              }, 500);
            }
          };

          return allErrors.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-bold text-red-800">
                      ⚠️ 执行警告
                    </h4>
                    {allErrors.map((error, index) => {
                      const fieldInfo = parseFieldError(error);
                      return (
                        <div key={index} className="text-sm text-red-700 leading-relaxed">
                          <span>{error}</span>
                          {fieldInfo && (
                            <button
                              type="button"
                              onClick={() => onJumpToField(fieldInfo.field)}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              → 跳转到{fieldInfo.label}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-xs text-red-600 mt-2">
                      💡 提示：如果是 API 相关错误，请检查 backend/.env 配置文件中的 API Key 是否正确设置。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null;
        })()}
      </AnimatePresence>
    </motion.article>
  );
}
