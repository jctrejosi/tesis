from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RangeTarget(BaseModel):
    """Parámetro con rango mínimo / objetivo / máximo (temperatura, HR…)."""

    min: Optional[float] = Field(default=None, ge=-100, le=200)
    target: Optional[float] = Field(default=None, ge=-100, le=200)
    max: Optional[float] = Field(default=None, ge=-100, le=200)
    unit: Optional[str] = None
    controllable: bool = True
    informational_only: bool = False
    reason: Optional[str] = None

    def validate_range(self) -> None:
        values = [v for v in (self.min, self.target, self.max) if v is not None]
        if len(values) >= 2 and any(
            a > b for a, b in zip(values, values[1:])
        ):
            raise ValueError("el rango debe cumplir min <= target <= max")


class ScheduleTarget(BaseModel):
    """Fotoperiodo / iluminación: horas de luz y oscuridad e intensidad."""

    hours_on: Optional[float] = Field(default=None, ge=0, le=24)
    hours_off: Optional[float] = Field(default=None, ge=0, le=24)
    intensity_target: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = None
    controllable: bool = True
    informational_only: bool = False
    reason: Optional[str] = None


class IrrigationTarget(BaseModel):
    """Riego: umbral de humedad del sustrato para activar, duración e
    intervalo mínimo entre riegos."""

    min_interval_hours: Optional[float] = Field(default=None, ge=0)
    duration_seconds: Optional[float] = Field(default=None, ge=0)
    threshold: Optional[float] = Field(default=None, ge=0, le=100)
    unit: Optional[str] = None
    controllable: bool = True
    informational_only: bool = False
    reason: Optional[str] = None


class CustomTarget(BaseModel):
    """Parámetro ambiental adicional definido por el usuario o el modelo,
    sin necesidad de modificar la arquitectura."""

    value: Optional[float] = None
    min: Optional[float] = None
    target: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[str] = None
    controllable: bool = False
    informational_only: bool = True
    reason: Optional[str] = None


class PhaseTargets(BaseModel):
    """Conjunto de objetivos de una fase. `custom` permite extender el modelo
    con parámetros adicionales sin cambiar el schema."""

    model_config = ConfigDict(extra="ignore")

    temperature: Optional[RangeTarget] = None
    humidity: Optional[RangeTarget] = None
    soil_moisture: Optional[RangeTarget] = None
    lighting: Optional[ScheduleTarget] = None
    ventilation: Optional[RangeTarget] = None
    extraction: Optional[RangeTarget] = None
    irrigation: Optional[IrrigationTarget] = None

    # Parámetros que dependen de hardware que el ESP actual no garantiza:
    # se modelan por si el hardware los incorpora, pero por defecto son
    # informativos (no se inventa mecanismo de control).
    co2: Optional[RangeTarget] = None
    substrate_temperature: Optional[RangeTarget] = None
    ec: Optional[RangeTarget] = None
    ph: Optional[RangeTarget] = None
    water_level: Optional[RangeTarget] = None

    custom: dict[str, CustomTarget] = Field(default_factory=dict)

    def validate_all_ranges(self) -> None:
        for field in (
            "temperature",
            "humidity",
            "soil_moisture",
            "ventilation",
            "extraction",
            "co2",
            "substrate_temperature",
            "ec",
            "ph",
            "water_level",
        ):
            target = getattr(self, field)
            if target is not None:
                target.validate_range()


RANGE_KEYS = (
    "temperature",
    "humidity",
    "soil_moisture",
    "ventilation",
    "extraction",
    "co2",
    "substrate_temperature",
    "ec",
    "ph",
    "water_level",
)
