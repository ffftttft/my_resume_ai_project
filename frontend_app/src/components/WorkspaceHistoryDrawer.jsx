import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, FileStack, X } from "lucide-react";

import HistoryCard from "./HistoryCard";

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

function pickLatestSnapshot(items) {
  return [...(items || [])].sort(
    (left, right) => toTimeValue(right?.timestamp) - toTimeValue(left?.timestamp),
  )[0] || null;
}

function NotesPanel({
  title,
  subtitle,
  analysisNotes = [],
  onResetToCurrent,
  showingSnapshot,
}) {
  return (
    <section className="history-notes-panel rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-600">
            生成说明
          </p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
            {analysisNotes.length} 条
          </span>
          {showingSnapshot ? (
            <button
              type="button"
              onClick={onResetToCurrent}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              查看当前结果
            </button>
          ) : null}
        </div>
      </div>

      {analysisNotes.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {analysisNotes.map((note, index) => (
            <li
              key={`${index}-${note}`}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600"
            >
              {note}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-500">
          当前还没有可展示的生成说明。完成一次生成、修订或优化后，这里会记录当轮结果的解释轨迹。
        </p>
      )}
    </section>
  );
}

export default function WorkspaceHistoryDrawer({
  open,
  onClose,
  analysisNotes,
  memory,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onPreviewUpload,
  onDeleteUpload,
  onPreviewExport,
  onRedownloadExport,
  onDeleteExport,
}) {
  const latestSnapshot = useMemo(
    () => pickLatestSnapshot(memory?.resume_snapshots || []),
    [memory?.resume_snapshots],
  );
  const [selectedSnapshotTimestamp, setSelectedSnapshotTimestamp] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedSnapshotTimestamp(latestSnapshot?.timestamp || "");
  }, [open, latestSnapshot?.timestamp]);

  const selectedSnapshot = useMemo(
    () =>
      (memory?.resume_snapshots || []).find(
        (item) => item?.timestamp && item.timestamp === selectedSnapshotTimestamp,
      ) || null,
    [memory?.resume_snapshots, selectedSnapshotTimestamp],
  );

  const showingSnapshot = Boolean(selectedSnapshot);
  const displayedNotes =
    selectedSnapshot?.analysis_notes?.length > 0 ? selectedSnapshot.analysis_notes : analysisNotes;
  const notesTitle = showingSnapshot
    ? selectedSnapshot.title?.trim() || "已选历史快照说明"
    : "当前工作区生成说明";
  const notesSubtitle = showingSnapshot
    ? `当前查看的是 ${formatDateTime(selectedSnapshot.timestamp)} 保存的快照说明；切换其他快照后，这里会同步更新。`
    : "默认展示当前工作区的说明；点击历史快照上的“查看说明”即可切换到对应记录。";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 bg-gray-900/35 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="history-drawer__panel custom-scrollbar border border-gray-200 bg-gray-50 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-drawer__masthead border-b border-gray-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-600">
                    历史抽屉
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900">历史记录与生成说明</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    快照、上传文件、导出记录和生成说明统一收纳在这里，不再占据主舞台空间。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
                  aria-label="关闭历史抽屉"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <Clock3 size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">本地档案</p>
                      <p className="text-sm text-gray-500">快照、上传记录与导出结果</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <FileStack size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">说明轨迹</p>
                      <p className="text-sm text-gray-500">可切换查看当前结果或历史快照的生成说明</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="history-drawer__body px-5 py-5">
              <div className="history-drawer__content grid min-h-0 gap-4">
                <NotesPanel
                  title={notesTitle}
                  subtitle={notesSubtitle}
                  analysisNotes={displayedNotes}
                  showingSnapshot={showingSnapshot}
                  onResetToCurrent={() => setSelectedSnapshotTimestamp("")}
                />

                <HistoryCard
                  memory={memory}
                  selectedSnapshotTimestamp={selectedSnapshotTimestamp}
                  onSelectSnapshot={(snapshot) => setSelectedSnapshotTimestamp(snapshot?.timestamp || "")}
                  onRestoreSnapshot={onRestoreSnapshot}
                  onDeleteSnapshot={onDeleteSnapshot}
                  onPreviewUpload={onPreviewUpload}
                  onDeleteUpload={onDeleteUpload}
                  onPreviewExport={onPreviewExport}
                  onRedownloadExport={onRedownloadExport}
                  onDeleteExport={onDeleteExport}
                />
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
