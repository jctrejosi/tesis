"""Catálogos de plantas: proxy hacia el servicio RAG compartido (Paimon)."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status

from app.api.deps import RagDep
from app.integrations.rag import RagServiceError, RagUnavailableError
from app.schemas.catalog import CatalogSearchRequest, CatalogTextIngest

router = APIRouter()


def _handle(exc: RagServiceError) -> None:
    """Traduce errores del servicio RAG a códigos HTTP del gateway."""
    if isinstance(exc, RagUnavailableError):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post(
    "/sources",
    status_code=status.HTTP_201_CREATED,
    summary="Cargar un catálogo de plantas desde un archivo",
)
async def ingest_catalog_file(
    rag: RagDep,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    description: str | None = Form(None),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="archivo sin nombre")
    data = await file.read()
    try:
        return await rag.ingest_file(
            filename=file.filename,
            data=data,
            title=title,
            description=description,
        )
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover


@router.post(
    "/sources/text",
    status_code=status.HTTP_201_CREATED,
    summary="Cargar un catálogo de plantas como texto",
)
async def ingest_catalog_text(
    payload: CatalogTextIngest, rag: RagDep
) -> dict[str, Any]:
    try:
        return await rag.ingest_text(
            title=payload.title,
            text=payload.text,
            description=payload.description,
        )
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover


@router.get("/sources", summary="Listar catálogos cargados")
async def list_catalog_sources(rag: RagDep) -> list[dict[str, Any]]:
    try:
        return await rag.list_sources()
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover


@router.get(
    "/sources/{source_id}",
    summary="Detalle de un catálogo (con sus fragmentos)",
)
async def get_catalog_source(
    source_id: uuid.UUID, rag: RagDep
) -> dict[str, Any]:
    try:
        return await rag.get_source(str(source_id))
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover


@router.delete(
    "/sources/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un catálogo y todos sus fragmentos",
)
async def delete_catalog_source(source_id: uuid.UUID, rag: RagDep) -> Response:
    try:
        await rag.delete_source(str(source_id))
    except RagServiceError as exc:
        _handle(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/search",
    summary="Buscar en los catálogos (embeddings + reranking opcional)",
)
async def search_catalog(
    payload: CatalogSearchRequest, rag: RagDep
) -> dict[str, Any]:
    try:
        results = await rag.search(
            payload.query,
            top_k=payload.top_k,
            use_reranker=payload.use_reranker,
            min_similarity=payload.min_similarity,
        )
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover
    return {"query": payload.query, "results": results}


@router.get(
    "/context",
    summary="Contexto de catálogo concatenado para una consulta",
)
async def catalog_context(rag: RagDep, q: str, top_k: int = 3) -> dict[str, Any]:
    try:
        return await rag.context(q, top_k=top_k)
    except RagServiceError as exc:
        _handle(exc)
        raise  # pragma: no cover
