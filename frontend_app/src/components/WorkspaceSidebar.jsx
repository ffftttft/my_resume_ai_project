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

function StatusPill({ tone = "pending", children }) {
  return <span className={`atelier-sidebar__status-pill atelier-sidebar__status-pill--${tone}`}>{children}</span>;
}

function ModelStatusBlock({ title, model, status, latency, meta, tone }) {
  return (
    <section className="atelier-sidebar__model-block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="atelier-sidebar__model-title">{title}</p>
          <h3 className="atelier-sidebar__status-title mt-1" title={model}>
            {model}
          </h3>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="atelier-sidebar__status-meta mt-2">{meta || (latency ? `延迟 ${latency}` : "未检测延迟")}</p>
    </section>
  );
}

export default function WorkspaceSidebar({
  sessionUsername,
  currentModeLabel,
  accountBalanceLabel,
  accountPointsLabel,
  accountMembershipLabel,
  currentBillingModeLabel,
  textModel,
  textModelStatus,
  textModelLatency,
  textModelTone,
  imageModel,
  imageModelStatus,
  imageModelMeta,
  imageModelTone,
  modelCheckedLabel,
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

        <section className="atelier-sidebar__card atelier-sidebar__card--compact mt-auto">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="atelier-sidebar__section-label">模型状态</p>
              <p className="atelier-sidebar__status-submeta mt-1">最近检测 {modelCheckedLabel}</p>
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

          <div className="grid gap-3">
            <ModelStatusBlock
              title="正文生成"
              model={textModel}
              status={textModelStatus}
              latency={textModelLatency}
              tone={textModelTone}
            />

            <ModelStatusBlock
              title="文件生成"
              model={imageModel}
              status={imageModelStatus}
              meta={imageModelMeta}
              tone={imageModelTone}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
