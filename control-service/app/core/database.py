"""Conexión a TimescaleDB y creación del esquema propio del control-service."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings

logger = logging.getLogger("control-service.db")

engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def is_postgres(url: str) -> bool:
    return url.split(":", 1)[0].split("+", 1)[0] == "postgresql"


async def init_db(settings: Settings) -> None:
    """Crea el esquema propio y la tabla del registry de modelos. Idempotente."""
    global engine, session_factory

    engine = create_async_engine(settings.database_url, pool_pre_ping=True)

    if is_postgres(settings.database_url):
        schema = settings.db_schema
        async with engine.begin() as conn:
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
            await conn.execute(
                text(
                    f'''
                    CREATE TABLE IF NOT EXISTS "{schema}".model_registry (
                        id           BIGSERIAL PRIMARY KEY,
                        name         TEXT NOT NULL,
                        version      TEXT NOT NULL,
                        kind         TEXT NOT NULL,
                        dataset_hash TEXT,
                        horizon      INT,
                        metrics      JSONB NOT NULL DEFAULT '{{}}'::jsonb,
                        active       BOOLEAN NOT NULL DEFAULT false,
                        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                    '''
                )
            )

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    logger.info("Base de datos lista (esquema: %s)", settings.db_schema)


async def get_session() -> AsyncIterator[AsyncSession]:
    if session_factory is None:
        raise RuntimeError("La base de datos no está inicializada")
    async with session_factory() as session:
        yield session


async def close_db() -> None:
    global engine, session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None
