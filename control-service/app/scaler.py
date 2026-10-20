"""Scaler compartido (z-score por variable) — capa 3, decisión D12.

El mismo `mean`/`std` que normaliza `x_t` alimenta el coste del MPC
(docs/especificacion.md §5 capa 5): `‖(x_τ − x*_τ) / σ‖`. Por eso se ajusta en
*entrenamiento*, se versiona y se persiste como artefacto reutilizable, en lugar
de que cada modelo de Astaroth normalice por su cuenta.

Unidad de normalización: `z = (x − mean) / std`, con `std` acotado inferiormente
para evitar divisiones por cero (variable constante ⇒ `std = 1`).
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core import database
from app.core.config import Settings

MIN_SAMPLES = 5


@dataclass
class Scaler:
    """Estadísticos de normalización por variable (z-score)."""

    name: str
    metrics: list[str]
    mean: dict[str, float]
    std: dict[str, float]
    samples: int = 0
    dataset_hash: str | None = None
    created_at: datetime | None = None

    @property
    def version(self) -> str:
        """Identificador reproducible del artefacto (mismo dato ⇒ misma versión)."""
        payload = {
            "name": self.name,
            "metrics": self.metrics,
            "mean": {m: round(self.mean.get(m, 0.0), 6) for m in self.metrics},
            "std": {m: round(self.std.get(m, 1.0), 6) for m in self.metrics},
            "samples": self.samples,
            "dataset_hash": self.dataset_hash,
        }
        digest = hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return digest[:12]

    def normalize_row(self, row: list[float]) -> list[float]:
        return [
            (value - self.mean.get(metric, 0.0)) / (self.std.get(metric) or 1.0)
            for value, metric in zip(row, self.metrics)
        ]

    def normalize(self, x: list[list[float]]) -> list[list[float]]:
        """Aplica el z-score a una ventana `[k][dim_x]`."""
        return [self.normalize_row(row) for row in x]

    def denormalize_row(self, row: list[float]) -> list[float]:
        """Inverso (para pasar una acción/coste del MPC de vuelta a unidades)."""
        return [
            value * (self.std.get(metric) or 1.0) + self.mean.get(metric, 0.0)
            for value, metric in zip(row, self.metrics)
        ]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "metrics": self.metrics,
            "mean": self.mean,
            "std": self.std,
            "samples": self.samples,
            "dataset_hash": self.dataset_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def fit(
    rows: list[dict],
    metrics: list[str],
    name: str = "cea-x",
    dataset_hash: str | None = None,
) -> Scaler:
    """Ajusta `mean`/`std` por variable sobre filas `{metric: value}`.

    Ignora `None` por variable; variable sin datos o constante ⇒ `mean=0`, `std=1`.
    """
    mean: dict[str, float] = {}
    std: dict[str, float] = {}
    for metric in metrics:
        values = [float(r[metric]) for r in rows if r.get(metric) is not None]
        if not values:
            mean[metric] = 0.0
            std[metric] = 1.0
            continue
        mu = sum(values) / len(values)
        variance = sum((v - mu) ** 2 for v in values) / len(values)
        sigma = math.sqrt(variance)
        mean[metric] = mu
        std[metric] = sigma if sigma > 1e-12 else 1.0
    return Scaler(
        name=name,
        metrics=list(metrics),
        mean=mean,
        std=std,
        samples=len(rows),
        dataset_hash=dataset_hash,
    )


async def save(settings: Settings, scaler: Scaler) -> str:
    """Persiste el scaler y lo marca activo (desactiva versiones previas del nombre)."""
    if database.session_factory is None or not database.is_postgres(settings.database_url):
        return scaler.version
    schema = settings.db_schema
    async with database.session_factory() as session:
        await session.execute(
            text(f'UPDATE "{schema}".scalers SET active = false WHERE name = :name'),
            {"name": scaler.name},
        )
        await session.execute(
            text(
                f'''
                INSERT INTO "{schema}".scalers
                    (name, version, metrics, mean, std, samples, dataset_hash, active)
                VALUES (:name, :version, CAST(:metrics AS jsonb), CAST(:mean AS jsonb),
                        CAST(:std AS jsonb), :samples, :dataset_hash, true)
                ON CONFLICT (name, version) DO UPDATE SET active = true
                '''
            ),
            {
                "name": scaler.name,
                "version": scaler.version,
                "metrics": json.dumps(scaler.metrics),
                "mean": json.dumps(scaler.mean),
                "std": json.dumps(scaler.std),
                "samples": scaler.samples,
                "dataset_hash": scaler.dataset_hash,
            },
        )
        await session.commit()
    return scaler.version


async def load_active(
    engine: AsyncEngine, settings: Settings, name: str | None = None
) -> Scaler | None:
    """Carga el scaler activo (último guardado con ese nombre) o `None`."""
    if not database.is_postgres(settings.database_url):
        return None
    schema = settings.db_schema
    sql = text(
        f'''
        SELECT name, version, metrics, mean, std, samples, dataset_hash, created_at
          FROM "{schema}".scalers
         WHERE active = true AND name = :name
         ORDER BY created_at DESC
         LIMIT 1
        '''
    )
    async with engine.connect() as conn:
        row = (await conn.execute(sql, {"name": name or settings.scaler_name})).mappings().first()
    if not row:
        return None
    return Scaler(
        name=row["name"],
        metrics=list(row["metrics"]),
        mean={k: float(v) for k, v in row["mean"].items()},
        std={k: float(v) for k, v in row["std"].items()},
        samples=int(row["samples"] or 0),
        dataset_hash=row["dataset_hash"],
        created_at=row["created_at"],
    )
