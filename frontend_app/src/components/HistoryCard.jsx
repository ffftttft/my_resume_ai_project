import React from "react";

function formatDateTime(value) {
  if (!value) return "未记录时间";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toTimeValue(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickLatestDistinct(items, getKey) {
  const indexedItems = (items || []).map((item, index) => ({ item, index }));
  indexedItems.sort((left, right) => {
    const timeDiff = toTimeValue(right.item?.timestamp) - toTimeValue(left.item?.timestamp);
    if (timeDiff !== 0) return timeDiff;
    return right.index - left.index;
  });

  const seen = new Set();
  const distinct = [];

  indexedItems.forEach(({ item }) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    distinct.push(item);
  });

  return distinct;
}

function SectionBlock({ title, subtitle, count, children }) {
  return (
    <section className="history-lane">
      <div className="history-lane__head">
        <div>
          <p className="history-lane__title">{title}</p>
          {subtitle ? <p className="history-lane__subtitle">{subtitle}</p> : null}
        </div>
        <span className="chip">{count}</span>
      </div>
      <div className="history-lane__body">{children}</div>
    </section>
  );
}

function ActionButton({ label, onClick, tone = "default", disabled = false }) {
  const toneClass =
    tone === "danger"
      ? "history-action history-action--danger"
      : tone === "accent"
        ? "history-action history-action--accent"
        : "history-action";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={toneClass}>
      {label}
    </button>
  );
}

function SnapshotItem({ item, onRestoreSnapshot, onDeleteSnapshot }) {
  const targetCompany = item.target_company?.trim() || "未填写公司";
  const targetRole = item.target_role?.trim() || "未填写岗位";

  return (
    <div className="history-entry">
      <div className="history-entry__main">
        <p className="history-entry__time">{formatDateTime(item.timestamp)}</p>
        <p className="history-entry__title">{targetCompany}</p>
        <p className="history-entry__meta">岗位：{targetRole}</p>
      </div>

      <div className="history-entry__actions">
        <ActionButton label="恢复" onClick={() => onRestoreSnapshot(item)} />
        <ActionButton label="删除" onClick={() => onDeleteSnapshot(item)} tone="danger" />
      </div>
    </div>
  );
}

function UploadItem({ item, onPreviewUpload, onDeleteUpload }) {
  return (
    <div className="history-entry">
      <div className="history-entry__main">
        <p className="history-entry__title break-all">{item.original_name || "未命名附件"}</p>
        <p className="history-entry__meta">
          {(item.file_type || "未知类型").toUpperCase()} · {formatDateTime(item.timestamp)}
        </p>
        {item.todo_notice ? <p className="history-entry__note">{item.todo_notice}</p> : null}
      </div>

      <div className="history-entry__actions">
        <ActionButton
          label="预览"
          onClick={() => onPreviewUpload(item)}
          tone="accent"
          disabled={!item.saved_name}
        />
        <ActionButton label="删除" onClick={() => onDeleteUpload(item)} tone="danger" />
      </div>
    </div>
  );
}

function ExportItem({ item, onPreviewExport, onRedownloadExport, onDeleteExport }) {
  return (
    <div className="history-entry">
      <div className="history-entry__main">
        <p className="history-entry__title break-all">{item.file_name || "未命名导出文件"}</p>
        <p className="history-entry__meta">
          {(item.format?.toUpperCase?.() || "未知格式")} · {formatDateTime(item.timestamp)}
        </p>
        <p className="history-entry__meta">
          {typeof item.size_bytes === "number" ? `${item.size_bytes} bytes` : "未记录文件大小"}
        </p>
      </div>

      <div className="history-entry__actions">
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
  const uploads = pickLatestDistinct(memory?.uploaded_files || [], (item) =>
    [
      item?.original_name?.trim(),
      item?.file_type?.trim(),
      item?.extracted_text_preview?.trim(),
      item?.todo_notice?.trim(),
    ]
      .filter(Boolean)
      .join("::"),
  );
  const downloads = pickLatestDistinct(memory?.downloaded_artifacts || [], (item) =>
    [item?.file_name?.trim(), item?.format?.trim(), item?.resume_text?.trim()]
      .filter(Boolean)
      .join("::"),
  );
  const snapshots = pickLatestDistinct(memory?.resume_snapshots || [], (item) =>
    [
      item?.target_company?.trim(),
      item?.target_role?.trim(),
      item?.generation_mode?.trim(),
      item?.resume_text?.trim(),
    ]
      .filter(Boolean)
      .join("::"),
  );

  return (
    <section className="paper-panel history-board p-6">
      <div className="history-board__header">
        <div>
          <p className="history-board__eyebrow">历史归档</p>
          <h3 className="history-board__title">本地历史档案</h3>
          <p className="history-board__description">
            集中查看快照、上传与导出记录。重复条目会自动合并，仅保留最新记录。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">快照 {snapshots.length}</span>
          <span className="chip">上传 {uploads.length}</span>
          <span className="chip">导出 {downloads.length}</span>
        </div>
      </div>

      <div className="history-board__grid">
        <SectionBlock title="简历快照" subtitle="可恢复到当前编辑区，也可直接删除。" count={snapshots.length}>
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
        </SectionBlock>

        <SectionBlock
          title="上传记录"
          subtitle="支持在线预览与删除，删除后会同时清理本地上传文件。"
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
        </SectionBlock>

        <SectionBlock
          title="导出记录"
          subtitle="支持在线预览、重新下载与删除。"
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
        </SectionBlock>
      </div>
    </section>
  );
}
