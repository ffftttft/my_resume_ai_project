import React from "react";

function formatDateTime(value) {
  if (!value) return "未记录时间";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function ScrollList({ title, subtitle, count, children }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white/72 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
          {subtitle && <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>}
        </div>
        <span className="chip">{count}</span>
      </div>
      <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-2">{children}</div>
    </section>
  );
}

function ActionButton({ label, onClick, tone = "default", disabled = false }) {
  const toneClass =
    tone === "danger"
      ? "border-orange-200 text-orange-700 hover:border-orange-400"
      : tone === "accent"
        ? "border-[var(--accent)] text-[var(--accent)] hover:brightness-105"
        : "border-slate-300 text-slate-700 hover:border-slate-500";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function SnapshotItem({ item, onRestoreSnapshot, onDeleteSnapshot }) {
  const targetCompany = item.target_company?.trim() || "未填写公司";
  const targetRole = item.target_role?.trim() || "未填写岗位";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">{formatDateTime(item.timestamp)}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">公司：{targetCompany}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">岗位：{targetRole}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton label="恢复" onClick={() => onRestoreSnapshot(item)} />
          <ActionButton label="删除" onClick={() => onDeleteSnapshot(item)} tone="danger" />
        </div>
      </div>
    </div>
  );
}

function UploadItem({ item, onPreviewUpload, onDeleteUpload }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ink)] break-all">{item.original_name || "未命名附件"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {(item.file_type || "未知类型").toUpperCase()} · {formatDateTime(item.timestamp)}
          </p>
          {item.todo_notice && (
            <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{item.todo_notice}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="预览"
            onClick={() => onPreviewUpload(item)}
            tone="accent"
            disabled={!item.saved_name}
          />
          <ActionButton label="删除" onClick={() => onDeleteUpload(item)} tone="danger" />
        </div>
      </div>
    </div>
  );
}

function ExportItem({ item, onPreviewExport, onRedownloadExport, onDeleteExport }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--ink)] break-all">{item.file_name || "未命名导出文件"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {(item.format?.toUpperCase?.() || "未知格式")} · {formatDateTime(item.timestamp)}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {typeof item.size_bytes === "number" ? `${item.size_bytes} bytes` : "未记录文件大小"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="预览"
            onClick={() => onPreviewExport(item)}
            tone="accent"
            disabled={!item.resume_text}
          />
          <ActionButton
            label="下载"
            onClick={() => onRedownloadExport(item)}
            disabled={!item.resume_text}
          />
          <ActionButton label="删除" onClick={() => onDeleteExport(item)} tone="danger" />
        </div>
      </div>
    </div>
  );
}

export default function HistoryCard({
  memory,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onPreviewUpload,
  onDeleteUpload,
  onPreviewExport,
  onRedownloadExport,
  onDeleteExport,
}) {
  const uploads = [...(memory?.uploaded_files || [])].reverse();
  const downloads = [...(memory?.downloaded_artifacts || [])].reverse();
  const snapshots = [...(memory?.resume_snapshots || [])].reverse();

  return (
    <section className="paper-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
            Persistent Memory
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">本地持久记录</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">快照 {snapshots.length}</span>
          <span className="chip">上传 {uploads.length}</span>
          <span className="chip">导出 {downloads.length}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ScrollList title="简历快照" subtitle="可恢复到编辑区，也可以直接删除。" count={snapshots.length}>
          {snapshots.length > 0 ? (
            snapshots.map((item, index) => (
              <SnapshotItem
                key={`${item.timestamp}-${index}`}
                item={item}
                onRestoreSnapshot={onRestoreSnapshot}
                onDeleteSnapshot={onDeleteSnapshot}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">还没有简历快照。</p>
          )}
        </ScrollList>

        <ScrollList
          title="上传记录"
          subtitle="支持网页预览和删除，删除后会同时清理本地保存的上传文件。"
          count={uploads.length}
        >
          {uploads.length > 0 ? (
            uploads.map((item, index) => (
              <UploadItem
                key={`${item.saved_name || item.original_name}-${index}`}
                item={item}
                onPreviewUpload={onPreviewUpload}
                onDeleteUpload={onDeleteUpload}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">还没有上传记录。</p>
          )}
        </ScrollList>

        <ScrollList
          title="导出记录"
          subtitle="支持网页预览、重新下载和删除，不用每次都先下载再查看。"
          count={downloads.length}
        >
          {downloads.length > 0 ? (
            downloads.map((item, index) => (
              <ExportItem
                key={`${item.file_name}-${item.timestamp || index}`}
                item={item}
                onPreviewExport={onPreviewExport}
                onRedownloadExport={onRedownloadExport}
                onDeleteExport={onDeleteExport}
              />
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">还没有导出记录。</p>
          )}
        </ScrollList>
      </div>
    </section>
  );
}
