from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api_routes import router
from app.clients import AstarothClient
from app.core.config import Settings, get_settings
from app.core.database import close_db, init_db

logger = logging.getLogger("control-service")
VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    await init_db(settings)
    app.state.astaroth = AstarothClient(settings)
    logger.info("control-service listo en http://%s:%s", settings.host, settings.port)
    yield
    await app.state.astaroth.aclose()
    await close_db()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="control-service",
        description=(
            "Control MPC/RL del sistema de cultivo automatizado (capas 3–7 de "
            "docs/arquitectura.md): estado x_t, world model (Astaroth), MPC, safety."
        ),
        version=VERSION,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.include_router(router)
    return app


app = create_app()
