"""Conexión a la base de datos.

El servicio reutiliza la instancia de TimescaleDB del proyecto (ver db/
en la raíz) pero vive en su propio esquema `plant_service`, de modo que
no interfiere con las tablas del backend NestJS. En los tests se usa
SQLite en memoria (mismo modelo, sin Postgres).
"""

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
from app.models.base import Base

logger = logging.getLogger("plant-service.db")

engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def is_postgres(url: str) -> bool:
    return url.split(":", 1)[0].split("+", 1)[0] == "postgresql"


async def init_db(settings: Settings) -> None:
    """Crea el esquema (si es Postgres) y las tablas. Idempotente."""
    global engine, session_factory

    connect_args: dict = {}
    if is_postgres(settings.database_url):
        # Cada conexión resuelve las tablas no calificadas en el esquema propio.
        connect_args = {"options": f"-c search_path={settings.db_schema},public"}

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    if is_postgres(settings.database_url):
        async with engine.begin() as conn:
            await conn.execute(
                text(f'CREATE SCHEMA IF NOT EXISTS "{settings.db_schema}"')
            )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
