from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.database import init_db
from app.integrations.deepseek import DeepSeekError
from app.integrations.rag import RagServiceError
from app.main import create_app
from app.schemas.recommendation import (
    PhaseRecommendation,
    RecommendationResponse,
)
from app.schemas.targets import (
    IrrigationTarget,
    PhaseTargets,
    RangeTarget,
    ScheduleTarget,
)


def sample_recommendation(veg_target: float = 24.0) -> RecommendationResponse:
    return RecommendationResponse(
        summary="Propuesta para tomate en invernadero",
        notes=["Valores de referencia agronómicos."],
        phases=[
            PhaseRecommendation(
                name="Germinación",
                description="Primeros días tras la siembra.",
                targets=PhaseTargets(
                    temperature=RangeTarget(
                        min=20, target=25, max=28, unit="°C", reason="Germinación óptima"
                    ),
                    humidity=RangeTarget(
                        min=70, target=80, max=90, unit="%HR", reason="Evita desecación"
                    ),
                    lighting=ScheduleTarget(
                        hours_on=16, hours_off=8, unit="h", reason="Fotoperiodo"
                    ),
                    irrigation=IrrigationTarget(
                        threshold=70, duration_seconds=30, min_interval_hours=12
                    ),
                ),
            ),
            PhaseRecommendation(
                name="Vegetativa",
                description="Crecimiento de hojas y tallos.",
                targets=PhaseTargets(
                    temperature=RangeTarget(
                        min=20, target=veg_target, max=28, unit="°C", reason="Crecimiento"
                    ),
                    humidity=RangeTarget(
                        min=55, target=65, max=75, unit="%HR", reason="Transpiración"
                    ),
                    lighting=ScheduleTarget(
                        hours_on=16, hours_off=8, unit="h", reason="Fotoperiodo"
                    ),
                    irrigation=IrrigationTarget(
                        threshold=40, duration_seconds=20, min_interval_hours=8
                    ),
                ),
            ),
            PhaseRecommendation(
                name="Floración",
                description="Cuajado de frutos.",
                targets=PhaseTargets(
                    temperature=RangeTarget(
                        min=18, target=22, max=26, unit="°C", reason="Cuajado"
                    ),
                    humidity=RangeTarget(
                        min=50, target=60, max=70, unit="%HR", reason="Polinización"
                    ),
                ),
            ),
        ],
    )


class FakeDeepSeekClient:
    """Reemplaza la integración HTTP real en los tests."""

    def __init__(self) -> None:
        self.response: RecommendationResponse = sample_recommendation()
        self.error: DeepSeekError | None = None
        self.calls: list[dict] = []

    async def aclose(self) -> None:
        pass

    async def recommend(self, crop_input: dict) -> RecommendationResponse:
        self.calls.append(crop_input)
        if self.error is not None:
            raise self.error
        return self.response


class FakeRagClient:
    """Reemplaza el servicio RAG HTTP en los tests."""

    def __init__(self) -> None:
        self.enabled = True
        self.context_text = "CULTIVO DE TOMATE: temperatura 24 °C, HR 65 %."
        self.context_chunks = 2
        self.error: RagServiceError | None = None
        self.calls: list[tuple] = []
        self.sources: list[dict] = []
        self.search_results: list[dict] = []

    async def aclose(self) -> None:
        pass

    async def ingest_text(self, *, title, text, description=None) -> dict:
        self.calls.append(("ingest_text", title, text, description))
        if self.error is not None:
            raise self.error
        return {
            "source_id": "11111111-1111-1111-1111-111111111111",
            "job_id": "22222222-2222-2222-2222-222222222222",
            "title": title,
            "status": "completed",
            "chunk_count": 3,
            "char_count": len(text),
            "message": "Ingesta completada.",
        }

    async def ingest_file(self, *, filename, data, title=None, description=None) -> dict:
        self.calls.append(("ingest_file", filename, len(data), title, description))
        if self.error is not None:
            raise self.error
        return {
            "source_id": "33333333-3333-3333-3333-333333333333",
            "job_id": "44444444-4444-4444-4444-444444444444",
            "filename": filename,
            "status": "completed",
            "message": "Ingesta completada.",
        }

    async def list_sources(self, status=None) -> list[dict]:
        self.calls.append(("list_sources", status))
        if self.error is not None:
            raise self.error
        return self.sources

    async def get_source(self, source_id: str) -> dict:
        self.calls.append(("get_source", source_id))
        if self.error is not None:
            raise self.error
        return {"source": {"id": source_id}, "documents": [], "last_job": None}

    async def delete_source(self, source_id: str) -> None:
        self.calls.append(("delete_source", source_id))
        if self.error is not None:
            raise self.error

    async def search(self, query, *, top_k=5, use_reranker=True, min_similarity=0.0):
        self.calls.append(("search", query, top_k, use_reranker))
        if self.error is not None:
            raise self.error
        return self.search_results

    async def context(self, query: str, *, top_k=None) -> dict:
        self.calls.append(("context", query, top_k))
        if self.error is not None:
            raise self.error
        return {
            "query": query,
            "context": self.context_text,
            "chunks_used": self.context_chunks,
        }

    async def build_context(self, query: str, *, top_k=None) -> tuple[str, int]:
        self.calls.append(("build_context", query, top_k))
        return self.context_text, self.context_chunks


@dataclass
class Env:
    client: AsyncClient
    app: Any
    fake_deepseek: FakeDeepSeekClient
    fake_rag: FakeRagClient


@pytest_asyncio.fixture
async def env() -> Env:
    settings = Settings(
        database_url="sqlite+aiosqlite://",
        deepseek_api_key="test-key",
        deepseek_model="deepseek-chat",
        device_api_key="device-secret",
        cors_origins="http://localhost:5173",
        # Aísla los tests de la configuración real (RAG se sustituye por un fake).
        rag_service_url="",
        rag_project="tesis",
        rag_namespace="plant-service",
    )
    await init_db(settings)
    app = create_app(settings)
    fake = FakeDeepSeekClient()
    app.state.deepseek = fake
    fake_rag = FakeRagClient()
    app.state.rag = fake_rag

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield Env(client=client, app=app, fake_deepseek=fake, fake_rag=fake_rag)

    from app.core.database import close_db

    await close_db()


DEVICE_HEADERS = {"X-API-Key": "device-secret"}
