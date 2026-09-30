"""Matriz de efecto `E[canal][variable]` (docs/especificacion.md §4.4).

La relación canal→variable **no se declara**: se estima de los datos. Aquí se usa
la diferencia estandarizada de la media de cada métrica cuando un canal está
`ON` vs `OFF` (efecto observado, con signo y confianza). Es la estimación barata
que informa al MPC de qué canal mueve qué variable.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from statistics import mean, pstdev
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings
from app.state import build_rows, latest_data_time

MIN_SAMPLES = 3  # mínimo de observaciones ON y OFF para reportar un efecto


def compute_effect_matrix(
    rows: list[dict], metrics: list[str], channels: list[int]
) -> dict[str, Any]:
    """Efecto observado de cada canal sobre cada métrica.

    Devuelve `{channel: {metric: {delta, effect, n_on, n_off, confidence}}}`
    donde `delta` es `media(ON) - media(OFF)` y `effect` el delta estandarizado
    (en desviaciones estándar de la métrica).
    """
    matrix: dict[str, Any] = {}
    for channel in channels:
        key = f"u{channel}"
        on = [row for row in rows if row.get(key) == 1]
        off = [row for row in rows if row.get(key) == 0]
        entry: dict[str, Any] = {}
        for metric in metrics:
            values = [row[metric] for row in rows if row.get(metric) is not None]
            if len(on) < MIN_SAMPLES or len(off) < MIN_SAMPLES or not values:
                entry[metric] = None
                continue
            delta = mean(row[metric] for row in on) - mean(row[metric] for row in off)
            sd = pstdev(values)
            effect = (delta / sd) if sd > 0 else 0.0
            coverage = len(on) / len(rows) if rows else 0.0
            entry[metric] = {
                "delta": round(delta, 5),
                "effect": round(effect, 4),
                "n_on": len(on),
                "n_off": len(off),
                "confidence": round(min(coverage, 1 - coverage) * 2, 4),
            }
        matrix[str(channel)] = entry
    return matrix


def rank_effects(matrix: dict[str, Any]) -> dict[str, list[dict]]:
    """Por cada métrica, canales ordenados por magnitud de efecto."""
    ranking: dict[str, list[dict]] = {}
    for channel, metrics in matrix.items():
        for metric, stats in metrics.items():
            if stats is None:
                continue
            ranking.setdefault(metric, []).append(
                {"channel": int(channel), **stats}
            )
    for metric in ranking:
        ranking[metric].sort(key=lambda item: abs(item["effect"]), reverse=True)
    return ranking


async def estimate(
    engine: AsyncEngine, settings: Settings, hours: int = 24
) -> dict[str, Any]:
    """Estima `E` sobre las últimas `hours` horas de datos alineados."""
    latest = await latest_data_time(engine, settings)
    if latest is None:
        return {"channels": settings.channel_list, "metrics": settings.metric_list,
                "matrix": {}, "ranking": {}, "rows": 0, "generated_at": None}
    since: datetime = latest - timedelta(hours=hours)
    rows = await build_rows(engine, settings, since, latest)
    matrix = compute_effect_matrix(rows, settings.metric_list, settings.channel_list)
    return {
        "channels": settings.channel_list,
        "metrics": settings.metric_list,
        "matrix": matrix,
        "ranking": rank_effects(matrix),
        "rows": len(rows),
        "generated_at": latest,
    }
