"""Template, avatar, and hfsyapi Image2 integration for resume image generation."""

from __future__ import annotations

import base64
import json
import mimetypes
import time
from pathlib import Path
from typing import Any, Dict, List
from urllib import request as urlrequest
from uuid import uuid4

from fastapi import UploadFile


ALLOWED_IMAGE_MODELS = {
    "gpt-image-2": {
        "label": "Image2",
        "size": "1024x1448",
    },
    "gpt-image-2pro": {
        "label": "Image2 Pro",
        "size": "2048x2896",
    },
}

ALLOWED_UPLOAD_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


class ResumeImageService:
    """Manage resume image templates, avatar uploads, and Image2 generation."""

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        default_model: str,
        template_dir: Path,
        generated_dir: Path,
        project_root: Path,
    ):
        self.api_key = api_key or ""
        self.base_url = (base_url or "https://www.hfsyapi.cn/v1").rstrip("/")
        self.default_model = default_model if default_model in ALLOWED_IMAGE_MODELS else "gpt-image-2"
        self.project_root = project_root
        self.template_dir = self._resolve_project_path(template_dir)
        self.generated_dir = self._resolve_project_path(generated_dir)
        self.avatar_dir = self.generated_dir.parent / "avatars"

        self.template_dir.mkdir(parents=True, exist_ok=True)
        self.generated_dir.mkdir(parents=True, exist_ok=True)
        self.avatar_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_project_path(self, path: Path) -> Path:
        resolved = Path(path)
        if not resolved.is_absolute():
            resolved = self.project_root / resolved
        return resolved.resolve()

    def _catalog_path(self) -> Path:
        return self.template_dir / "catalog.json"

    def _public_image_url(self, route: str, file_name: str) -> str:
        return f"/api/{route}/{file_name}"

    def _safe_child_path(self, directory: Path, file_name: str) -> Path:
        safe_name = Path(file_name or "").name
        if not safe_name or safe_name != file_name:
            raise FileNotFoundError("Image file was not found.")
        path = (directory / safe_name).resolve()
        if directory.resolve() not in path.parents and path != directory.resolve():
            raise FileNotFoundError("Image file was not found.")
        if not path.exists() or not path.is_file():
            raise FileNotFoundError("Image file was not found.")
        return path

    def list_templates(self) -> Dict[str, Any]:
        """Return normalized template metadata and preview URLs."""

        catalog_path = self._catalog_path()
        if not catalog_path.exists():
            return {"templates": [], "default_template_id": ""}

        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
        records = raw.get("templates") if isinstance(raw, dict) else raw
        templates: List[Dict[str, Any]] = []

        for record in records or []:
            if not isinstance(record, dict):
                continue
            template_id = str(record.get("id") or "").strip()
            file_name = str(record.get("file_name") or record.get("file") or "").strip()
            if not template_id or not file_name:
                continue
            templates.append(
                {
                    "id": template_id,
                    "name": str(record.get("name") or template_id),
                    "category": str(record.get("category") or ""),
                    "description": str(record.get("description") or ""),
                    "file_name": Path(file_name).name,
                    "style_tags": list(record.get("style_tags") or record.get("tags") or []),
                    "is_default": bool(record.get("is_default")),
                    "preview_url": f"/api/resume/image/templates/{template_id}/preview",
                }
            )

        default_template = next((item for item in templates if item["is_default"]), templates[0] if templates else None)
        return {
            "templates": templates,
            "default_template_id": default_template["id"] if default_template else "",
        }

    def _find_template(self, template_id: str) -> Dict[str, Any]:
        templates = self.list_templates().get("templates") or []
        for template in templates:
            if template.get("id") == template_id:
                return template
        raise FileNotFoundError("Resume template was not found.")

    def get_template_path(self, template_id: str) -> Path:
        template = self._find_template(template_id)
        return self._safe_child_path(self.template_dir, template["file_name"])

    def get_avatar_path(self, saved_name: str) -> Path:
        return self._safe_child_path(self.avatar_dir, Path(saved_name or "").name)

    def get_generated_image_path(self, file_name: str) -> Path:
        return self._safe_child_path(self.generated_dir, Path(file_name or "").name)

    def save_avatar_upload(self, upload: UploadFile) -> Dict[str, Any]:
        """Save a user avatar image and return metadata for frontend preview."""

        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in ALLOWED_UPLOAD_SUFFIXES:
            raise ValueError("Avatar must be a JPG, PNG, or WEBP image.")

        content = upload.file.read()
        upload.file.close()
        if not content:
            raise ValueError("Avatar image is empty.")

        saved_name = f"{uuid4().hex}{suffix}"
        path = self.avatar_dir / saved_name
        path.write_bytes(content)
        return {
            "saved_name": saved_name,
            "original_name": upload.filename or saved_name,
            "preview_url": self._public_image_url("avatar", saved_name),
        }

    def _data_url_from_path(self, path: Path) -> str:
        mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    def _build_prompt(self, resume_text: str, has_avatar: bool, template_name: str) -> str:
        avatar_instruction = (
            "头像参考用户提供的证件照，保留真实证件照风格，不要大幅改脸，不要卡通化。"
            if has_avatar
            else "未提供用户头像时，请保留模板中的照片位置或使用简洁占位，不要虚构真实人脸。"
        )
        fact_boundary_instruction = (
            "CRITICAL FACT BOUNDARY: Only typeset the resume content provided below. "
            "Do not add, infer, translate, summarize, embellish, or invent any experience, award, "
            "certificate, metric, company, school, project, title, contact detail, date, or tool. "
            "If a section is absent from the resume content, omit that section or leave whitespace. "
            "Keep names, phone numbers, emails, dates, project names, company names, school names, "
            "and numbers as exact as possible."
        )
        return (
            f"{fact_boundary_instruction}\n"
            "生成一张标准A4竖版中文简历图片，参考提供的简历模板版式、层级、字体感觉、色彩和信息组织方式，"
            f"模板名称：{template_name}。白底或浅灰底，商务、专业、清晰，适合打印、投递、转PDF。"
            "不要生成正方形海报，不要海报风，不要艺术字，不要添加虚假经历。"
            "请严格使用用户提供的简历内容，尽量保持联系方式、姓名、时间、项目名称准确。"
            "头像放在右上角或模板指定照片位置。"
            f"{avatar_instruction}\n\n简历内容如下：\n{resume_text.strip()}"
        )

    def _post_generation(self, payload: Dict[str, Any], timeout_seconds: int = 180) -> Dict[str, Any]:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request = urlrequest.Request(
            f"{self.base_url}/images/generations",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json; charset=utf-8",
            },
        )
        with urlrequest.urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))

    def _save_response_image(self, response_payload: Dict[str, Any]) -> Dict[str, str]:
        data = response_payload.get("data") or []
        first = data[0] if data and isinstance(data[0], dict) else {}
        suffix = ".png"
        saved_name = f"{uuid4().hex}{suffix}"
        target_path = self.generated_dir / saved_name

        image_url = first.get("url") or first.get("b64_json")
        b64_data = first.get("b64_data")

        if image_url and isinstance(image_url, str) and image_url.startswith("http"):
            with urlrequest.urlopen(image_url, timeout=120) as response:
                target_path.write_bytes(response.read())
            return {
                "saved_name": saved_name,
                "source_url": image_url,
                "preview_url": self._public_image_url("resume/image/generated", saved_name),
            }

        encoded = b64_data or image_url
        if isinstance(encoded, str) and encoded.startswith("data:"):
            encoded = encoded.split(",", 1)[1]
        if isinstance(encoded, str) and encoded.strip():
            target_path.write_bytes(base64.b64decode(encoded))
            return {
                "saved_name": saved_name,
                "source_url": "",
                "preview_url": self._public_image_url("resume/image/generated", saved_name),
            }

        raise RuntimeError("hfsyapi did not return a usable image URL or base64 payload.")

    def generate_resume_image(
        self,
        *,
        resume_text: str,
        template_id: str,
        avatar_saved_name: str = "",
        model: str = "",
        board: str = "",
    ) -> Dict[str, Any]:
        """Generate and persist one resume image from resume text and references."""

        cleaned_resume = (resume_text or "").strip()
        if not cleaned_resume:
            raise ValueError("Resume text is required before generating an image.")
        if not self.api_key:
            raise RuntimeError("HFSY_API_KEY is not configured.")

        selected_model = model if model in ALLOWED_IMAGE_MODELS else self.default_model
        model_info = ALLOWED_IMAGE_MODELS[selected_model]
        template = self._find_template(template_id)
        template_path = self.get_template_path(template_id)
        reference_images = [self._data_url_from_path(template_path)]

        avatar_path = None
        if avatar_saved_name:
            avatar_path = self.get_avatar_path(avatar_saved_name)
            reference_images.append(self._data_url_from_path(avatar_path))

        prompt = self._build_prompt(
            cleaned_resume,
            has_avatar=avatar_path is not None,
            template_name=template.get("name") or template_id,
        )
        payload = {
            "model": selected_model,
            "n": 1,
            "size": model_info["size"],
            "prompt": prompt,
            "reference_images": reference_images[:4],
            "response_format": "b64_json",
        }

        started_at = time.perf_counter()
        response_payload = self._post_generation(payload)
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        image_record = self._save_response_image(response_payload)
        return {
            **image_record,
            "model": selected_model,
            "model_label": model_info["label"],
            "size": model_info["size"],
            "template_id": template_id,
            "template_name": template.get("name") or template_id,
            "board": board,
            "latency_ms": latency_ms,
            "reference_count": len(reference_images),
        }

    def probe_models(self, *, include_live_probe: bool = False) -> Dict[str, Any]:
        """Return Image2 configuration status without calling paid generation APIs."""

        checked_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        status: Dict[str, Any] = {
            "image2": {
                "provider": "hfsyapi",
                "model": "gpt-image-2",
                "label": "Image2",
                "configured": bool(self.api_key),
                "reachable": False,
                "status": "configured" if self.api_key else "not_configured",
                "latency_ms": None,
                "checked_at": checked_at,
                "error": "" if self.api_key else "HFSY_API_KEY is not configured.",
            },
            "image2_pro": {
                "provider": "hfsyapi",
                "model": "gpt-image-2pro",
                "label": "Image2 Pro",
                "configured": bool(self.api_key),
                "reachable": False,
                "status": "configured" if self.api_key else "not_configured",
                "latency_ms": None,
                "checked_at": checked_at,
                "error": "" if self.api_key else "HFSY_API_KEY is not configured.",
            },
        }

        return status
