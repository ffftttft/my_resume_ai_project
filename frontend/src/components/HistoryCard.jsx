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
      <div className="mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-2">{children}</div>
    </section>
  );
}

function SnapshotItem({ item, onRestoreSnapshot, onDeleteSnapshot }) {
  const targetCompany = item.target_company?.trim() || "未填写求职公司";
  const targetRole = item.target_role?.trim() || "未填写求职岗位";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--muted)]">{formatDateTime(item.timestamp)}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink)]">求职公司：{targetCompany}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink)]">求职岗位：{targetRole}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRestoreSnapshot(item)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
          >
            恢复
          </button>
          <button
            type="button"
            onClick={() => onDeleteSnapshot(item)}
            className="rounded-full border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:border-orange-400"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryCard({
  memory,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onRedownloadExport,
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
          <h3 className="mt-2 text-2xl font-semibold text-[var(--ink)]">本地永久记忆</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">快照 {snapshots.length}</span>
          <span className="chip">上传 {uploads.length}</span>
          <span className="chip">导出 {downloads.length}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ScrollList title="简历快照" subtitle="生成一次保存一次，点击可恢复或删除。" count={snapshots.length}>
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

        <ScrollList title="上传记录" subtitle="保留你已上传过的附件摘要。" count={uploads.length}>
          {uploads.length > 0 ? (
            uploads.map((item, index) => (
              <div
                key={`${item.saved_name || item.original_name}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3"
              >
                <p className="font-semibold text-[var(--ink)]">{item.original_name || "未命名附件"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.file_type || "未知类型"}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{formatDateTime(item.timestamp)}</p>
                {item.todo_notice && (
                  <p className="mt-2 text-xs font-semibold text-[var(--accent)]">{item.todo_notice}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">还没有上传记录。</p>
          )}
        </ScrollList>

        <ScrollList title="导出记录" subtitle="点击任意记录，可再次下载原来的导出内容。" count={downloads.length}>
          {downloads.length > 0 ? (
            downloads.map((item, index) => (
              <button
                key={`${item.file_name}-${item.timestamp || index}`}
                type="button"
                onClick={() => onRedownloadExport(item)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-left transition hover:border-[var(--accent)] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink)] break-all">{item.file_name || "未命名文件"}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {(item.format?.toUpperCase?.() || "未知格式")} · {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent)]">下载</span>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {typeof item.size_bytes === "number" ? `${item.size_bytes} bytes` : "未记录大小"}
                </p>
              </button>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">还没有导出记录。</p>
          )}
        </ScrollList>
      </div>
    </section>
  );
}
