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
      className={`upload-dropzone ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
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

      <div className="upload-dropzone__inner">
        <div className="upload-dropzone__orb">
          <span className="upload-dropzone__orb-mark">+</span>
        </div>

        <div className="upload-dropzone__content">
          <p className="upload-dropzone__title">{title}</p>
          {description ? <p className="upload-dropzone__description">{description}</p> : null}
          {note ? <p className="upload-dropzone__note">{note}</p> : null}
        </div>

        <div className="upload-dropzone__actions">
          <label htmlFor={inputId} className="upload-dropzone__button">
            {buttonLabel}
          </label>
          <span className="upload-dropzone__hint">点击选择或直接拖拽上传</span>
        </div>
      </div>
    </div>
  );
}
