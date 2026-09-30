"""Predictores del world model (capa 4, parte barata).

Interfaz común: `predict(engine, settings, window, horizon) -> [H][dim_x]`.
- `Persistence`: `x_{t+1} = x_t` (baseline mínimo).
- `AstarothXGB`: baseline por variable vía `Astaroth/XGBoost-api` (D9).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncEngine

from app.clients import AstarothClient
from app.core.config import Settings
from app.state import Window, build_rows


class Predictor(Protocol):
    name: str

    async def predict(
        self,
        engine: AsyncEngine,
        settings: Settings,
        window: Window,
        horizon: int,
    ) -> list[list[float]]: ...


class Persistence:
    """Baseline trivial: el estado no cambia."""

    name = "persistence"

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        last = window.latest
        return [list(last) for _ in range(horizon)]


class AstarothXGB:
    """Baseline sólido: un modelo XGBoost por variable servido por Astaroth."""

    name = "xgb"

    def __init__(self, client: AstarothClient, prefix: str = "cea") -> None:
        self._client = client
        self._prefix = prefix

    def model_name(self, metric: str) -> str:
        return f"{self._prefix}:{metric}"

    async def _history_rows(
        self, engine: AsyncEngine, settings: Settings, window: Window, rows: int = 60
    ) -> list[dict]:
        end = window.latest_time or datetime.now(timezone.utc)
        start = end - timedelta(seconds=settings.freq_seconds * (rows - 1))
        return await build_rows(engine, settings, start, end)

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        history = await self._history_rows(engine, settings, window)
        per_metric: list[list[float]] = []
        for metric in window.metrics:
            result = await self._client.xgb_predict(
                self.model_name(metric), horizon, history
            )
            points = result.get("predictions", [])
            per_metric.append([float(p["value"]) for p in points])
        # [dim_x][H] → [H][dim_x]
        return [
            [per_metric[j][i] for j in range(len(window.metrics))]
            for i in range(horizon)
        ]


async def train_xgb(
    client: AstarothClient,
    settings: Settings,
    engine: AsyncEngine,
    start: datetime,
    end: datetime,
    prefix: str = "cea",
) -> list[dict]:
    """Entrena un modelo XGBoost por métrica en Astaroth. Devuelve las métricas."""
    rows = await build_rows(engine, settings, start, end)
    if len(rows) < 30:
        raise ValueError(
            f"histórico insuficiente para entrenar ({len(rows)} filas); amplía el rango"
        )
    results = []
    for metric in settings.metric_list:
        res = await client.xgb_train(f"{prefix}:{metric}", metric, rows)
        results.append({"metric": metric, **res})
    return {"rows": len(rows), "models": results}


class AstarothITransformer:
    """iTransformer (forecast **pasivo** seq→seq; sin acciones, D9).

    Se le envía solo el estado `x` (no `u`), así que predice "qué pasaría sin
    actuar": sirve de comparación y de predictor de contexto.
    """

    name = "transformer"

    def __init__(self, client: AstarothClient, prefix: str = "cea") -> None:
        self._client = client
        self._prefix = prefix

    def model_name(self) -> str:
        return f"{self._prefix}:it"

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        end = window.latest_time or datetime.now(timezone.utc)
        start = end - timedelta(seconds=settings.freq_seconds * 47)
        rows = await build_rows(engine, settings, start, end)
        history = [
            {k: row[k] for k in ("date", *settings.metric_list)} for row in rows
        ]
        result = await self._client.transformer_predict(
            self.model_name(), horizon, history
        )
        forecast = result.get("forecast", [])
        return [
            [float(point[m]) for m in settings.metric_list] for point in forecast
        ]


async def train_transformer(
    client: AstarothClient,
    settings: Settings,
    engine: AsyncEngine,
    start: datetime,
    end: datetime,
    prefix: str = "cea",
) -> dict:
    """Entrena el iTransformer (multivariante, solo `x`) en Astaroth."""
    rows = await build_rows(engine, settings, start, end)
    history = [{k: row[k] for k in ("date", *settings.metric_list)} for row in rows]
    if len(history) < 40:
        raise ValueError(
            f"histórico insuficiente para iTransformer ({len(history)} filas)"
        )
    result = await client.transformer_train(f"{prefix}:it", history)
    return {"rows": len(history), "model": result}
