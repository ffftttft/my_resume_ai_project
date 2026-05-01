import React, { useId } from "react";
import { Camera, X } from "lucide-react";

export default function AvatarUploadField({
  avatar,
  disabled = false,
  onUpload,
  onClear,
  title = "个人头像",
  description = "用于生成简历文件时参考证件照位置。",
}) {
  const inputId = useId();
  const hasAvatar = Boolean(avatar?.preview_url);

  return (
    <section className="avatar-upload-card">
      <div className="avatar-upload-card__preview">
        {hasAvatar ? (
          <img src={avatar.preview_url} alt="当前头像预览" />
        ) : (
          <Camera size={28} />
        )}
      </div>

      <div className="avatar-upload-card__body">
        <div>
          <p className="avatar-upload-card__title">{title}</p>
          <p className="avatar-upload-card__description">{description}</p>
          {hasAvatar ? (
            <p className="avatar-upload-card__file" title={avatar.original_name || avatar.saved_name}>
              {avatar.original_name || avatar.saved_name}
            </p>
          ) : null}
        </div>

        <div className="avatar-upload-card__actions">
          <input
            id={inputId}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            disabled={disabled}
            onChange={(event) => onUpload?.(event.target.files, event.target)}
            className="hidden"
          />
          <label htmlFor={inputId} className="avatar-upload-card__button">
            {hasAvatar ? "更换头像" : "上传头像"}
          </label>
          {hasAvatar ? (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="avatar-upload-card__clear"
              aria-label="清除头像"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
