"""Reference-resume retrieval service for lightweight RAG enrichment."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

from .embedding_service import EmbeddingService

try:  # Optional dependency: the service still works without ChromaDB installed.
    import chromadb  # type: ignore
except Exception:  # pragma: no cover - optional runtime dependency
    chromadb = None


TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9.+#/-]{1,}|[\u4e00-\u9fff]{2,8}")


@dataclass
class RagReferenceDocument:
    """One normalized reference resume document."""

    doc_id: str
    title: str
    role: str
    industry: str
    text: str
    key_terms: List[str]
    source_title: str = ""
    source_url: str = ""
    source_note: str = ""


class RagService:
    """Search anonymized reference resumes and return prompt-safe context."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        reference_dir: Path,
        top_k: int = 3,
        enabled: bool = True,
        backend: str = "local",
        chroma_persist_dir: Path | None = None,
        collection_name: str = "resume_reference_library",
    ):
        self.embedding_service = embedding_service
        self.reference_dir = Path(reference_dir)
        self.reference_dir.mkdir(parents=True, exist_ok=True)
        self.top_k = max(1, int(top_k or 3))
        self.enabled = bool(enabled)
        self.backend = (backend or "local").strip().lower()
        self.chroma_persist_dir = Path(chroma_persist_dir) if chroma_persist_dir else None
        self.collection_name = collection_name
        self._documents: List[RagReferenceDocument] | None = None
        self._document_vectors: Dict[str, List[float]] = {}
        self._chroma_collection = None

    def _tokenize(self, text: str) -> List[str]:
        return [match.group(0).strip().lower() for match in TOKEN_PATTERN.finditer(text or "")]

    def _normalize_json_entry(self, entry: Dict, fallback_id: str) -> RagReferenceDocument | None:
        title = (entry.get("title") or entry.get("name") or entry.get("role") or fallback_id).strip()
        role = (entry.get("role") or "").strip()
        industry = (entry.get("industry") or "").strip()
        summary = (entry.get("summary") or "").strip()
        text = (entry.get("text") or "").strip()
        skills = [str(item).strip() for item in entry.get("skills", []) if str(item).strip()]
        bullets = [str(item).strip() for item in entry.get("bullets", []) if str(item).strip()]
        merged_text = "\n".join(
            part
            for part in [
                title,
                role,
                industry,
                summary,
                f"技能：{'、'.join(skills)}" if skills else "",
                f"亮点：{'；'.join(bullets)}" if bullets else "",
                text,
            ]
            if part
        ).strip()
        if not merged_text:
            return None

        key_terms = skills[:8] or self._tokenize(merged_text)[:8]
        return RagReferenceDocument(
            doc_id=(entry.get("id") or fallback_id).strip(),
            title=title,
            role=role,
            industry=industry,
            text=merged_text,
            key_terms=key_terms,
            source_title=(entry.get("source_title") or "").strip(),
            source_url=(entry.get("source_url") or "").strip(),
            source_note=(entry.get("source_note") or "").strip(),
        )

    def _load_documents(self) -> List[RagReferenceDocument]:
        if self._documents is not None:
            return self._documents

        documents: List[RagReferenceDocument] = []
        for path in sorted(self.reference_dir.glob("*")):
            if path.is_dir():
                continue

            if path.suffix.lower() == ".json":
                try:
                    payload = json.loads(path.read_text(encoding="utf-8"))
                except Exception:
                    continue

                entries = payload if isinstance(payload, list) else payload.get("items", [])
                for index, entry in enumerate(entries):
                    if not isinstance(entry, dict):
                        continue
                    normalized = self._normalize_json_entry(entry, f"{path.stem}-{index + 1}")
                    if normalized:
                        documents.append(normalized)
                continue

            if path.suffix.lower() in {".txt", ".md"}:
                text = path.read_text(encoding="utf-8").strip()
                if not text:
                    continue
                documents.append(
                    RagReferenceDocument(
                        doc_id=path.stem,
                        title=path.stem.replace("_", " "),
                        role="",
                        industry="",
                        text=text,
                        key_terms=self._tokenize(text)[:8],
                    )
                )

        self._documents = documents
        return documents

    def _ensure_chroma_collection(self) -> None:
        if self._chroma_collection is not None:
            return
        if self.backend != "chromadb" or chromadb is None or not self.chroma_persist_dir:
            return

        self.chroma_persist_dir.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(self.chroma_persist_dir))
        self._chroma_collection = client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def _hydrate_document_vectors(self, documents: List[RagReferenceDocument]) -> None:
        if not documents or not self.embedding_service.is_available:
            return

        pending_docs = [doc for doc in documents if doc.doc_id not in self._document_vectors]
        if not pending_docs:
            return

        vectors = self.embedding_service.embed_texts(
            [doc.text for doc in pending_docs],
            scope="语义检索",
        )
        for doc, vector in zip(pending_docs, vectors):
            self._document_vectors[doc.doc_id] = vector

        self._ensure_chroma_collection()
        if self._chroma_collection is not None:
            self._chroma_collection.upsert(
                ids=[doc.doc_id for doc in pending_docs],
                documents=[doc.text for doc in pending_docs],
                metadatas=[
                    {
                        "title": doc.title,
                        "role": doc.role,
                        "industry": doc.industry,
                        "key_terms": "、".join(doc.key_terms),
                        "source_title": doc.source_title,
                        "source_url": doc.source_url,
                        "source_note": doc.source_note,
                    }
                    for doc in pending_docs
                ],
                embeddings=[self._document_vectors[doc.doc_id] for doc in pending_docs],
            )

    def _lexical_search(self, query: str, documents: List[RagReferenceDocument], top_k: int) -> List[Dict]:
        query_tokens = set(self._tokenize(query))
        ranked: List[tuple[float, RagReferenceDocument]] = []
        for document in documents:
            doc_tokens = set(self._tokenize(document.text))
            if not doc_tokens:
                continue
            overlap = len(query_tokens & doc_tokens)
            union = len(query_tokens | doc_tokens) or 1
            score = overlap / union
            if score <= 0:
                continue
            ranked.append((score, document))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "id": doc.doc_id,
                "title": doc.title,
                "role": doc.role,
                "industry": doc.industry,
                "similarity": round(score, 4),
                "key_terms": doc.key_terms[:8],
                "excerpt": doc.text[:220],
                "source_title": doc.source_title,
                "source_url": doc.source_url,
                "source_note": doc.source_note,
            }
            for score, doc in ranked[:top_k]
        ]

    def _semantic_search(self, query: str, documents: List[RagReferenceDocument], top_k: int) -> List[Dict]:
        self._hydrate_document_vectors(documents)
        query_vector = self.embedding_service.embed_text(query, scope="语义检索")

        if self._chroma_collection is not None:
            result = self._chroma_collection.query(
                query_embeddings=[query_vector],
                n_results=top_k,
                include=["metadatas", "documents", "distances"],
            )
            matches: List[Dict] = []
            for index, metadata in enumerate((result.get("metadatas") or [[]])[0]):
                document_text = ((result.get("documents") or [[]])[0][index] or "").strip()
                distance = ((result.get("distances") or [[]])[0][index] or 1.0)
                similarity = max(0.0, 1.0 - float(distance))
                key_terms = [
                    item for item in str(metadata.get("key_terms", "")).split("、") if item
                ][:8]
                matches.append(
                    {
                        "id": ((result.get("ids") or [[]])[0][index] or "").strip(),
                        "title": metadata.get("title", ""),
                        "role": metadata.get("role", ""),
                        "industry": metadata.get("industry", ""),
                        "similarity": round(similarity, 4),
                        "key_terms": key_terms,
                        "excerpt": document_text[:220],
                        "source_title": metadata.get("source_title", ""),
                        "source_url": metadata.get("source_url", ""),
                        "source_note": metadata.get("source_note", ""),
                    }
                )
            return matches

        ranked: List[tuple[float, RagReferenceDocument]] = []
        for document in documents:
            vector = self._document_vectors.get(document.doc_id) or []
            similarity = self.embedding_service.cosine_similarity(query_vector, vector)
            if similarity <= 0:
                continue
            ranked.append((similarity, document))

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "id": doc.doc_id,
                "title": doc.title,
                "role": doc.role,
                "industry": doc.industry,
                "similarity": round(score, 4),
                "key_terms": doc.key_terms[:8],
                "excerpt": doc.text[:220],
                "source_title": doc.source_title,
                "source_url": doc.source_url,
                "source_note": doc.source_note,
            }
            for score, doc in ranked[:top_k]
        ]

    def search(self, query: str, top_k: int | None = None) -> Dict:
        """Search the reference corpus and return ranked snippets plus backend metadata."""

        cleaned_query = (query or "").strip()
        if not self.enabled:
            return {
                "mode": "disabled",
                "count": 0,
                "results": [],
            }
        documents = self._load_documents()
        if not cleaned_query or not documents:
            return {
                "mode": "empty",
                "count": 0,
                "results": [],
            }

        limit = max(1, int(top_k or self.top_k))
        if self.embedding_service.is_available:
            try:
                results = self._semantic_search(cleaned_query, documents, limit)
                return {
                    "mode": "semantic",
                    "count": len(results),
                    "results": results,
                }
            except Exception as exc:
                lexical = self._lexical_search(cleaned_query, documents, limit)
                return {
                    "mode": "lexical_fallback",
                    "count": len(lexical),
                    "results": lexical,
                    "warning": str(exc) or self.embedding_service.build_fallback_warning("语义检索"),
                }

        lexical = self._lexical_search(cleaned_query, documents, limit)
        return {
            "mode": "lexical_fallback",
            "count": len(lexical),
            "results": lexical,
        }

    def build_prompt_context(self, target_role: str, job_requirements: str, top_k: int | None = None) -> List[Dict]:
        """Return compact prompt-safe reference context for generation and optimization."""

        if not self.enabled:
            return []

        query = "\n".join(
            part for part in [(target_role or "").strip(), (job_requirements or "").strip()] if part
        ).strip()
        results = self.search(query, top_k=top_k).get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "role": item.get("role", ""),
                "industry": item.get("industry", ""),
                "similarity": item.get("similarity", 0),
                "key_terms": item.get("key_terms", []),
                "excerpt": item.get("excerpt", ""),
                "source_title": item.get("source_title", ""),
                "source_url": item.get("source_url", ""),
                "source_note": item.get("source_note", ""),
            }
            for item in results
        ]
