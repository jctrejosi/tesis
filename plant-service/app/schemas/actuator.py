from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# Catálogo cerrado de funciones: qué puede haber conectado a un canal de relé.
ActuatorFunction = Literal[
    "light",
    "ventilation",
    "extraction",
    "humidification",
    "irrigation",
    "heating",
    "co2_injection",
    "other",
]
ACTUATOR_FUNCTIONS: tuple[str, ...] = (
    "light",
    "ventilation",
    "extraction",
    "humidification",
    "irrigation",
    "heating",
    "co2_injection",
    "other",
)


class ActuatorConstraints(BaseModel):
    """Límites **por canal** (política de safety), no semántica del dispositivo."""

    model_config = ConfigDict(extra="allow")

    max_duration_s: float | None = Field(default=None, ge=0)
    min_interval_s: float | None = Field(default=None, ge=0)
    max_switches_per_hour: float | None = Field(default=None, ge=0)
    cooldown_s: float | None = Field(default=None, ge=0)


class ActuatorConfig(BaseModel):
    """Configuración semántica de un canal de relé (el hardware solo tiene pines).

    `function` es una **pista** (catálogo cerrado); la relación canal→variable la
    descubre el modelo (matriz `E`). `constraints` sí es declarado: es política.
    """

    channel: int = Field(ge=1, le=64)
    label: str | None = Field(default=None, max_length=120)
    function: ActuatorFunction = "other"
    constraints: ActuatorConstraints = Field(default_factory=ActuatorConstraints)
    enabled: bool = True


class ActuatorRegistryRead(ActuatorConfig):
    """Configuración de un canal tal como está almacenada."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    device_id: int
    updated_at: datetime


class ActuatorConfigSnapshotRead(BaseModel):
    """Instantánea de la configuración de todos los canales en un instante."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    valid_from: datetime
    version: str | None = None
    config: list[dict[str, Any]] = []
    created_at: datetime
