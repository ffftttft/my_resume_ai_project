import React, { useId, useState } from "react";

export default function UploadDropZone({
  accept,
  buttonLabel = "选择文件",
  title,
  description,
  note = "也支持直接拖拽文件到这里。",
  disabled = false,
  multiple = false,
  onFilesSelected,
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  function handleFiles(files, inputElement) {
    if (disabled || !files || files.length === 0) {
      return;
    }
    onFilesSelected?.(files, inputElement);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer?.files, null);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) {
          setDragging(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={handleDrop}
      className={`rounded-[20px] border border-dashed px-5 py-5 transition ${
        dragging
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-slate-300 bg-slate-50/60"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files, event.target)}
        className="hidden"
      />

      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        {description && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>}
        {note && <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <label
            htmlFor={inputId}
            className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
          >
            {buttonLabel}
          </label>
          <span className="text-xs text-[var(--muted)]">支持按钮选择，也支持拖拽上传</span>
        </div>
      </div>
    </div>
  );
}
