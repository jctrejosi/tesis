"""Esquemas de entrada de los endpoints de catálogo.

Las respuestas las produce el servicio RAG compartido y se devuelven tal cual
(el contrato es el de `rag_service`).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CatalogTextIngest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1)
    description: str | None = None


class CatalogSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)
    use_reranker: bool = True
    min_similarity: float = 0.0
