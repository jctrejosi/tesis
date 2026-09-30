"""Registry de modelos (capa 8/9 ligera): versiona artefactos y métricas."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core import database
from app.core.config import Settings
from app.state import Window


def dataset_hash(window: Window) -> str:
    """Identifica la ventana de datos usada (contrato + valores)."""
    payload = {
        "metrics": window.metrics,
        "channels": window.channels,
        "timestamps": [ts.isoformat() for ts in window.timestamps],
        "x": window.x,
        "u": window.u,
    }
    digest = hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return digest[:16]


async def record(
    settings: Settings,
    *,
    name: str,
    version: str,
    kind: str,
    dataset_hash_value: str | None,
    horizon: int | None,
    metrics: dict[str, Any],
    active: bool = False,
) -> None:
    if database.session_factory is None or not database.is_postgres(settings.database_url):
        return
    schema = settings.db_schema
    async with database.session_factory() as session:
        await session.execute(
            text(
                f'''
                INSERT INTO "{schema}".model_registry
                    (name, version, kind, dataset_hash, horizon, metrics, active)
                VALUES (:name, :version, :kind, :dataset_hash, :horizon,
                        CAST(:metrics AS jsonb), :active)
                '''
            ),
            {
                "name": name,
                "version": version,
                "kind": kind,
                "dataset_hash": dataset_hash_value,
                "horizon": horizon,
                "metrics": json.dumps(metrics),
                "active": active,
            },
        )
        await session.commit()


async def list_models(engine: AsyncEngine, settings: Settings) -> list[dict]:
    if not database.is_postgres(settings.database_url):
        return []
    schema = settings.db_schema
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                f'''
                SELECT name, version, kind, dataset_hash, horizon, metrics,
                       active, created_at
                  FROM "{schema}".model_registry
                 ORDER BY created_at DESC
                 LIMIT 100
                '''
            )
        )
        return [dict(row) for row in result.mappings()]
