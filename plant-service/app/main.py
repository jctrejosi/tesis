from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.database import close_db, init_db
from app.core.logging import setup_logging
from app.integrations.deepseek import DeepSeekClient, DeepSeekError

logger = logging.getLogger("plant-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    setup_logging(settings.log_level)
    await init_db(settings)
    app.state.deepseek = DeepSeekClient(settings)
    logger.info("%s listo en http://%s:%s", settings.app_name, settings.host, settings.port)
    yield
    await app.state.deepseek.aclose()
    await close_db()


def create_app(settings: Settings | None = None) -> FastAPI:
    """Factory de la aplicación (permite inyectar settings en los tests)."""
    settings = settings or get_settings()
    app = FastAPI(
        title="plant-service",
        description=(
            "Gestión de la configuración ambiental de cultivos y entrega de "
            "parámetros objetivo al ESP32. Recomendaciones generadas por "
            "DeepSeek, validadas y editables manualmente."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = settings

    # Toda la app (incluidas las dependencias) usa esta instancia de settings.
    app.dependency_overrides[get_settings] = lambda: settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "api": "/api/v1",
        }

    @app.exception_handler(DeepSeekError)
    async def deepseek_error_handler(request: Request, exc: DeepSeekError) -> JSONResponse:
        logger.error("Error de DeepSeek: %s", exc)
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Error no controlado en %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "error interno del servicio"})

    return app


app = create_app()
