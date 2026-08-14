from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text

from app.core.config import Settings, get_settings
from app.core.database import get_session

router = APIRouter()


@router.get("/health")
async def health(
    request: Request,
    session: object = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict:
    db_status = "connected"
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": settings.app_name,
        "version": "0.1.0",
        "database": db_status,
        "deepseek_configured": settings.deepseek_enabled,
    }
