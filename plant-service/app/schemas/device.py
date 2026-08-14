from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CurrentPhase(BaseModel):
    phase: str | None
    crop: str | None
    active: bool
    updated_at: datetime | None


class DeviceTargets(BaseModel):
    """Objetivos compactos que el ESP debe aplicar en la fase activa."""

    phase: str
    crop: str
    version: str
    updated_at: datetime
    targets: dict[str, Any]


class DeviceConfig(BaseModel):
    """Configuración completa (y compacta) que el ESP consulta al arrancar
    o periódicamente."""

    protocol_version: int = 1
    device_type: str = "growbox"
    current_phase: str | None
    crop: str | None
    version: str | None
    updated_at: datetime | None
    targets: dict[str, Any] = Field(default_factory=dict)


class TelemetryIn(BaseModel):
    """Mediciones enviadas por el ESP. Los campos conocidos se validan;
    los campos adicionales que envíe el hardware se conservan tal cual en el
    payload (extra="allow") para no perder datos de sensores futuros."""

    model_config = ConfigDict(extra="allow")

    device_id: str = Field(min_length=1, max_length=64)
    timestamp: datetime | None = None  # si falta, se usa la hora del servidor

    temperature: float | None = Field(default=None, ge=-50, le=120)
    humidity: float | None = Field(default=None, ge=0, le=100)
    soil_moisture: float | None = Field(default=None, ge=0, le=100)
    light: float | None = Field(default=None, ge=0)

    # Sensores opcionales (solo si el hardware los tiene)
    co2: float | None = Field(default=None, ge=0)
    substrate_temperature: float | None = Field(default=None, ge=-50, le=120)
    ec: float | None = Field(default=None, ge=0)
    ph: float | None = Field(default=None, ge=0, le=14)
    water_level: float | None = Field(default=None, ge=0)
