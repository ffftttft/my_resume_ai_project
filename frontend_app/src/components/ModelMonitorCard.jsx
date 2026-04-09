import React from "react";

const STATUS_META = {
  operational: {
    label: "可用",
    chipClass: "accent-chip",
    toneClass: "text-emerald-700 bg-emerald-50",
  },
  degraded: {
    label: "响应较慢",
    chipClass: "",
    toneClass: "text-amber-700 bg-amber-50",
  },
  error: {
    label: "不可用",
    chipClass: "",
    toneClass: "text-orange-700 bg-orange-50",
  },
  fallback_only: {
    label: "仅本地兜底",
    chipClass: "",
    toneClass: "text-slate-700 bg-slate-100",
  },
  pending: {
    label: "检查中",
    chipClass: "",
    toneClass: "text-slate-700 bg-slate-100",
  },
};

function formatDateTime(value) {
  if (!value) return "尚未检查";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function getSummaryText(monitorStatus) {
  if (monitorStatus?.error) return monitorStatus.error;
  if (monitorStatus?.reachable) return "当前模型接口可达，可以继续正常生成简历。";
  if (monitorStatus?.status === "fallback_only") return "当前未连接模型接口，系统会退回本地兜底逻辑。";
  return "暂时还没有拿到最新探测结果。";
}

export default function ModelMonitorCard({ backendStatus, monitorStatus, loading, onRefresh }) {
  const statusMeta = STATUS_META[monitorStatus?.status] || STATUS_META.pending;
  const checkedAt = formatDateTime(monitorStatus?.checked_at);

  return (
    <section className="paper-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
            Model Status
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">AI 状态</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            这里只保留一个结果：现在能不能正常用。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${statusMeta.chipClass}`}>{statusMeta.label}</span>
          <span className="chip">{backendStatus?.ai_available ? "可继续生成" : "当前走本地兜底"}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "检查中..." : "刷新状态"}
          </button>
        </div>
      </div>

      <div className={`mt-5 rounded-[20px] border border-transparent px-4 py-4 text-sm leading-6 ${statusMeta.toneClass}`}>
        {getSummaryText(monitorStatus)}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">最近更新：{checkedAt}</p>
    </section>
  );
}
