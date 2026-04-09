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
    <div className="dialog-shell">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-preview-title"
        aria-describedby={note ? "record-preview-note" : undefined}
        className="paper-panel-strong float-card record-dialog-shell"
      >
        <div className="record-dialog-shell__header">
          <div>
            <p className="record-dialog-shell__eyebrow">Web Preview</p>
            <h2 id="record-preview-title" className="record-dialog-shell__title">
              {title || "预览"}
            </h2>
          </div>

          <button type="button" onClick={onClose} className="record-dialog-shell__close">
            关闭
          </button>
        </div>

        <div className="record-dialog-shell__frame">
          {loading ? (
            <div className="record-dialog-shell__empty">正在加载预览内容...</div>
          ) : content?.trim() ? (
            <pre className="record-dialog-shell__content">{content}</pre>
          ) : (
            <div className="record-dialog-shell__empty">当前没有可预览的正文内容。</div>
          )}
        </div>

        {note ? (
          <p id="record-preview-note" className="record-dialog-shell__note">
            {note}
          </p>
        ) : null}

        <div className="record-dialog-shell__actions">
          {onDownload ? (
            <button type="button" onClick={onDownload} className="record-dialog-shell__secondary">
              下载这份记录
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="record-dialog-shell__primary">
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}
