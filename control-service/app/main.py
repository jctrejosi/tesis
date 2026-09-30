from __future__ import annotations

from fastapi import FastAPI

SERVICE_NAME = "control-service"
VERSION = "0.1.0"

app = FastAPI(
    title=SERVICE_NAME,
    description=(
        "Control MPC/RL del sistema de cultivo automatizado (capas 3–7 de "
        "`docs/arquitectura.md`). Estado, world model, MPC, safety y actuación."
    ),
    version=VERSION,
)


@app.get("/health", summary="Salud del servicio")
async def health() -> dict:
    return {"status": "ok", "service": SERVICE_NAME, "version": VERSION}


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": SERVICE_NAME, "docs": "/docs", "health": "/health"}
