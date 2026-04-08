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

function formatLatency(value) {
  return typeof value === "number" ? `${value} ms` : "未返回";
}

function getSummaryText(monitorStatus) {
  if (monitorStatus?.error) return monitorStatus.error;
  if (monitorStatus?.reachable) return "当前模型接口可达，可以继续正常生成简历。";
  if (monitorStatus?.status === "fallback_only") return "当前未连接模型接口，系统会退回本地兜底逻辑。";
  return "暂时还没有拿到最新探测结果。";
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

export default function ModelMonitorCard({ backendStatus, monitorStatus, loading, onRefresh }) {
  const statusMeta = STATUS_META[monitorStatus?.status] || STATUS_META.pending;

  return (
    <section className="paper-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
            Model Status
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">当前模型可用性</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            这里展示当前模型是否可用的实时结果，不再显示冗长的探测历史。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${statusMeta.chipClass}`}>{statusMeta.label}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "检查中..." : "刷新状态"}
          </button>
        </div>
      </div>

      <div className={`mt-5 rounded-[24px] px-4 py-4 text-sm ${statusMeta.toneClass}`}>
        {getSummaryText(monitorStatus)}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <InfoItem label="模型" value={backendStatus?.model || monitorStatus?.model || "未配置"} />
        <InfoItem label="最近检查" value={formatDateTime(monitorStatus?.checked_at)} />
        <InfoItem label="延迟" value={formatLatency(monitorStatus?.latency_ms)} />
      </div>
    </section>
  );
}
