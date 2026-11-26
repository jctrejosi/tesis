"""Cliente HTTP del servicio RAG compartido (Paimon `rag_service`).

plant-service ya no almacena catálogos ni genera embeddings: delega la ingesta y
la búsqueda semántica en el servicio central. Todo el contenido se aísla con el
namespace `RAG_NAMESPACE` (por defecto `plant-service`).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger("plant-service.rag")


class RagServiceError(Exception):
    """Error base del servicio RAG."""


class RagUnavailableError(RagServiceError):
    """El servicio no está configurado o no responde."""


class RagClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base_url = settings.rag_service_url.strip().rstrip("/")
        self._http: httpx.AsyncClient | None = None

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None:
            headers = {"Accept": "application/json"}
            if self._settings.rag_service_api_key.strip():
                headers["X-API-Key"] = self._settings.rag_service_api_key.strip()
            if self._settings.rag_project.strip():
                headers["X-RAG-Project"] = self._settings.rag_project.strip()
            self._http = httpx.AsyncClient(
                base_url=self._base_url or "http://unconfigured",
                headers=headers,
                timeout=self._settings.rag_timeout_seconds,
            )
        return self._http

    @property
    def enabled(self) -> bool:
        return bool(self._base_url)

    @property
    def namespace(self) -> str:
        return self._settings.rag_namespace

    async def aclose(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None

    # ── Interno ───────────────────────────────────────────────────────────

    def _require_enabled(self) -> None:
        if not self.enabled:
            raise RagUnavailableError(
                "RAG_SERVICE_URL no está configurada: el servicio de catálogos "
                "no está disponible"
            )

    async def _request(
        self, method: str, path: str, **kwargs: Any
    ) -> Any:
        self._require_enabled()
        try:
            response = await self._get_http().request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise RagUnavailableError("timeout esperando al servicio RAG") from exc
        except httpx.HTTPError as exc:
            raise RagUnavailableError(f"error de red hacia el servicio RAG: {exc}") from exc

        if response.status_code >= 400:
            detail: Any
            try:
                detail = response.json().get("detail")
            except ValueError:
                detail = response.text[:300]
            raise RagServiceError(f"el servicio RAG respondió {response.status_code}: {detail}")

        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    # ── Ingesta ───────────────────────────────────────────────────────────

    async def ingest_file(
        self,
        *,
        filename: str,
        data: bytes,
        title: str | None = None,
        description: str | None = None,
    ) -> dict[str, Any]:
        form: dict[str, str] = {"bot_id": self.namespace}
        if title:
            form["title"] = title
        if description:
            form["description"] = description
        return await self._request(
            "POST",
            "/ingest",
            data=form,
            files={"file": (filename, data, "application/octet-stream")},
        )

    async def ingest_text(
        self,
        *,
        title: str,
        text: str,
        description: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "title": title,
            "text": text,
            "description": description,
            "bot_id": self.namespace,
        }
        return await self._request("POST", "/ingest/text", json=payload)

    # ── Administración ────────────────────────────────────────────────────

    async def list_sources(self, status: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, str] = {"bot_id": self.namespace}
        if status:
            params["status"] = status
        return await self._request("GET", "/sources", params=params)

    async def get_source(self, source_id: str) -> dict[str, Any]:
        return await self._request("GET", f"/sources/{source_id}")

    async def delete_source(self, source_id: str) -> None:
        await self._request("DELETE", f"/sources/{source_id}")

    # ── Recuperación ──────────────────────────────────────────────────────

    async def search(
        self,
        query: str,
        *,
        top_k: int = 5,
        use_reranker: bool = True,
        min_similarity: float = 0.0,
    ) -> list[dict[str, Any]]:
        payload = {
            "query": query,
            "top_k": top_k,
            "use_reranker": use_reranker,
            "min_similarity": min_similarity,
        }
        data = await self._request(
            "POST", "/search", params={"bot_id": self.namespace}, json=payload
        )
        return data.get("results", []) if isinstance(data, dict) else []

    async def context(
        self, query: str, *, top_k: int | None = None
    ) -> dict[str, Any]:
        """Contexto concatenado; propaga los errores del servicio."""
        return await self._request(
            "GET",
            "/context",
            params={
                "q": query,
                "bot_id": self.namespace,
                "top_k": top_k or self._settings.rag_context_chunks,
            },
        )

    async def build_context(
        self, query: str, *, top_k: int | None = None
    ) -> tuple[str, int]:
        """Contexto de catálogo para fundamentar una recomendación.

        Si el servicio no está configurado o falla, se degrada a ``("", 0)``:
        la recomendación sigue funcionando sin datos de catálogo.
        """
        if not self.enabled or not query.strip():
            return "", 0
        try:
            data = await self._request(
                "GET",
                "/context",
                params={
                    "q": query,
                    "bot_id": self.namespace,
                    "top_k": top_k or self._settings.rag_context_chunks,
                },
            )
        except RagServiceError as exc:
            logger.warning("No se pudo obtener contexto del RAG: %s", exc)
            return "", 0
        if not isinstance(data, dict):
            return "", 0
        return data.get("context", ""), int(data.get("chunks_used", 0))
