from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.core.database import init_db
from app.integrations.deepseek import DeepSeekError
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


@dataclass
class Env:
    client: AsyncClient
    app: Any
    fake_deepseek: FakeDeepSeekClient


@pytest_asyncio.fixture
async def env() -> Env:
    settings = Settings(
        database_url="sqlite+aiosqlite://",
        deepseek_api_key="test-key",
        deepseek_model="deepseek-chat",
        device_api_key="device-secret",
        cors_origins="http://localhost:5173",
    )
    await init_db(settings)
    app = create_app(settings)
    fake = FakeDeepSeekClient()
    app.state.deepseek = fake

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield Env(client=client, app=app, fake_deepseek=fake)

    from app.core.database import close_db

    await close_db()


DEVICE_HEADERS = {"X-API-Key": "device-secret"}
