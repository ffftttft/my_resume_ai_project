import React from "react";
import { Activity, CreditCard, Gauge, RefreshCw, Sparkles, Wallet } from "lucide-react";

function MetricRow({ icon: Icon, label, value }) {
  return (
    <div className="atelier-sidebar__metric">
      <span className="atelier-sidebar__metric-label">
        <Icon size={14} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export default function WorkspaceSidebar({
  sessionUsername,
  currentModeLabel,
  accountBalanceLabel,
  accountPointsLabel,
  accountMembershipLabel,
  currentBillingModeLabel,
  currentModelLabel,
  modelAvailability,
  modelAvailabilityLabel = "不可用",
  modelStatusTone = "pending",
  modelHealthLabel = "待检测",
  modelLatencyLabel,
  modelCheckedLabel,
  modelStatusHint = "",
  modelStatusLoading,
  onRefreshModel,
}) {
  return (
    <aside className="atelier-sidebar hidden h-screen w-80 shrink-0 xl:flex xl:flex-col">
      <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
        <div className="atelier-sidebar__brand">
          <p className="atelier-sidebar__brand-mark">CAREER ATELIER</p>
          <h1 className="atelier-sidebar__brand-title">智能简历工作台</h1>
          <div className="atelier-sidebar__mode-chip">{currentModeLabel}</div>
        </div>

        <section className="atelier-sidebar__card mt-8">
          <div className="flex items-start gap-3">
            <span className="atelier-sidebar__icon">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900" title={sessionUsername}>
                {sessionUsername}
              </p>
              <p className="mt-1 text-xs text-slate-500">账户概览</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <MetricRow icon={Wallet} label="余额" value={accountBalanceLabel} />
            <MetricRow icon={Gauge} label="积分" value={accountPointsLabel} />
            <MetricRow icon={Activity} label="会员" value={accountMembershipLabel} />
            <MetricRow icon={CreditCard} label="计费" value={currentBillingModeLabel} />
          </div>
        </section>

        <div className="atelier-sidebar__card atelier-sidebar__card--compact mt-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="atelier-sidebar__section-label">模型状态</p>
              <h3 className="atelier-sidebar__status-title mt-2" title={currentModelLabel}>
                {currentModelLabel}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`atelier-sidebar__status-pill atelier-sidebar__status-pill--${modelStatusTone}`}
                >
                  {modelHealthLabel}
                </span>
                <p
                  className={`atelier-sidebar__status-meta atelier-sidebar__status-meta--${modelStatusTone}`}
                >
                  {(modelAvailabilityLabel || (modelAvailability ? "可用" : "不可用"))} · 延迟{" "}
                  {modelLatencyLabel}
                </p>
              </div>
              <p className="atelier-sidebar__status-submeta mt-1">最近检测 {modelCheckedLabel}</p>
              <p className="atelier-sidebar__status-hint mt-3">
                {modelStatusHint || "手动刷新后会重新探测当前模型与接口延迟。"}
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshModel}
              disabled={modelStatusLoading}
              className="atelier-sidebar__refresh"
            >
              <RefreshCw size={14} className={modelStatusLoading ? "animate-spin" : ""} />
              {modelStatusLoading ? "刷新中" : "刷新"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
