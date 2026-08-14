from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.integrations.deepseek import DeepSeekClient

SessionDep = Annotated[object, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_deepseek_client(request: Request) -> DeepSeekClient:
    """Cliente HTTP hacia DeepSeek, creado en el ciclo de vida de la app."""
    return request.app.state.deepseek


DeepSeekDep = Annotated[DeepSeekClient, Depends(get_deepseek_client)]


def require_device_key(
    x_api_key: Annotated[str | None, Header()] = None,
    settings: SettingsDep = None,
) -> None:
    """Autenticación simple para los endpoints del dispositivo: clave estática
    compartida en el header `X-API-Key`. Documentada en docs/esp-contract.md.

    Si DEVICE_API_KEY no está configurada, los endpoints quedan deshabilitados
    (503) para no dejar el servicio abierto accidentalmente."""
    if not settings.device_api_key:
        raise HTTPException(
            status_code=503,
            detail="DEVICE_API_KEY no configurada en el servidor",
        )
    if not x_api_key or not secrets.compare_digest(x_api_key, settings.device_api_key):
        raise HTTPException(status_code=401, detail="X-API-Key inválida o ausente")
