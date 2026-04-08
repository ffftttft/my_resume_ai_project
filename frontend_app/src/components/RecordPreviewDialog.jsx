import React from "react";

export default function RecordPreviewDialog({
  open,
  title,
  content,
  note,
  loading,
  onClose,
  onDownload,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/32 p-4 backdrop-blur-sm">
      <div className="paper-panel-strong float-card flex max-h-[88vh] w-full max-w-5xl flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.28em] text-[var(--accent)] uppercase">
              Web Preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{title || "预览"}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          >
            关闭
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 rounded-[24px] border border-slate-200 bg-white/80 p-4">
          {loading ? (
            <div className="flex h-full min-h-[18rem] items-center justify-center text-sm text-[var(--muted)]">
              正在加载预览内容...
            </div>
          ) : content?.trim() ? (
            <pre className="h-full max-h-[56vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-7 text-[var(--ink)]">
              {content}
            </pre>
          ) : (
            <div className="flex h-full min-h-[18rem] items-center justify-center text-sm text-[var(--muted)]">
              当前没有可预览的正文内容。
            </div>
          )}
        </div>

        {note && <p className="mt-3 text-sm text-[var(--muted)]">{note}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
            >
              下载这份记录
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}
