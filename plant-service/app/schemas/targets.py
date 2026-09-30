from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# Límites físicos plausibles por unidad (validación "por unidad").
# Si la unidad no se indica o es desconocida, no se aplica cota numérica
# (solo el chequeo de orden min <= target <= max).
_UNIT_BOUNDS: dict[str, tuple[float, float]] = {
    # temperatura
    "c": (-50, 100), "°c": (-50, 100), "celsius": (-50, 100), "centigrade": (-50, 100),
    "f": (-60, 220), "°f": (-60, 220),
    # humedad / proporción
    "%": (0, 100), "pct": (0, 100), "percent": (0, 100), "rh": (0, 100),
    # gases
    "ppm": (0, 50000), "ppb": (0, 50_000_000),
    # conductividad eléctrica
    "ms/cm": (0, 50), "ds/m": (0, 50), "us/cm": (0, 50000),
    # acidez
    "ph": (0, 14),
    # presión
    "hpa": (300, 1100), "mbar": (300, 1100), "kpa": (30, 110),
    "pa": (30000, 110000), "bar": (0.3, 1.1), "atm": (0.003, 1.1),
    # luz
    "lux": (0, 200000), "lx": (0, 200000), "klx": (0, 200),
    "par": (0, 3000), "ppfd": (0, 3000),
    "umol/m2/s": (0, 3000), "umol/m²/s": (0, 3000),
    "w/m2": (0, 1500), "w/m²": (0, 1500), "mol/m2/d": (0, 100), "dli": (0, 100),
    # tiempo
    "s": (0, 86400), "sec": (0, 86400), "seg": (0, 86400), "seconds": (0, 86400),
    "min": (0, 1440), "minutes": (0, 1440), "h": (0, 168), "hours": (0, 168),
    # volumen / caudal
    "l": (0, 100000), "ml": (0, 100000), "l/min": (0, 1000), "l/h": (0, 60000),
    "m3/h": (0, 100000), "m³/h": (0, 100000),
}


def _norm_unit(unit: str) -> str:
    return (
        unit.strip()
        .lower()
        .replace("μ", "u")
        .replace("µ", "u")
        .replace(" ", "")
    )


def unit_bounds(unit: str | None) -> tuple[float, float] | None:
    """Cota física `(min, max)` para una unidad; `None` si no se conoce."""
    if not unit:
        return None
    u = _norm_unit(unit)
    if u in _UNIT_BOUNDS:
        return _UNIT_BOUNDS[u]
    if u.startswith("%"):
        return _UNIT_BOUNDS["%"]
    if u.startswith("°"):
        return _UNIT_BOUNDS["f"] if u.endswith("f") else _UNIT_BOUNDS["c"]
    if "ppm" in u:
        return _UNIT_BOUNDS["ppm"]
    if "us/cm" in u or "µs/cm" in u:
        return _UNIT_BOUNDS["us/cm"]
    return None


class RangeTarget(BaseModel):
    """Parámetro con rango mínimo / objetivo / máximo (temperatura, HR…).

    El valor se valida **por unidad** (`unit`): ppm para CO₂ admite cientos o
    miles, mientras que °C se limita a un rango térmico. Sin unidad (o unidad
    desconocida) no se aplica cota numérica, solo el orden min <= target <= max.
    """

    min: Optional[float] = None
    target: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[str] = None
    controllable: bool = True
    informational_only: bool = False
    reason: Optional[str] = None

    @model_validator(mode="after")
    def _check_unit_bounds(self) -> "RangeTarget":
        bounds = unit_bounds(self.unit)
        if bounds is None:
            return self
        lo, hi = bounds
        for name, value in (
            ("min", self.min),
            ("target", self.target),
            ("max", self.max),
        ):
            if value is not None and not (lo <= value <= hi):
                raise ValueError(
                    f"{name}={value} fuera del rango físico para la unidad "
                    f"'{self.unit}' ({lo}..{hi})"
                )
        return self

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
