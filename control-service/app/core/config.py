from __future__ import annotations

import json
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Conjunto núcleo del vector de estado x_t (docs/datos.md §1.2).
DEFAULT_METRICS = (
    "temperature,humidity,pressure,co2,ec,vpd,dew_point,ndvi,par,ec_compensated"
)

# Cotas físicas por métrica (capa 3): valores fuera de rango se tratan como
# hueco (no contaminan la ventana). Alineadas con `unit_bounds()` de
# plant-service (`app/schemas/targets.py`).
DEFAULT_METRIC_BOUNDS: dict[str, tuple[float, float]] = {
    "temperature": (-50.0, 100.0),      # °C
    "humidity": (0.0, 100.0),           # %
    "pressure": (300.0, 1100.0),        # hPa
    "co2": (0.0, 50000.0),              # ppm
    "ec": (0.0, 50.0),                  # mS/cm
    "vpd": (0.0, 20.0),                 # kPa
    "dew_point": (-50.0, 100.0),        # °C
    "ndvi": (-1.0, 1.0),                # índice
    "par": (0.0, 200000.0),             # µmol/m²/s (estimador AS7341: escala alta)
    "ec_compensated": (0.0, 50.0),      # mS/cm
}


class Settings(BaseSettings):
    """Configuración del control-service (entorno o `.env`)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "control-service"
    host: str = "0.0.0.0"
    port: int = 8100
    log_level: str = "INFO"

    # TimescaleDB compartida (mismo formato que plant-service).
    database_url: str = (
        "postgresql+psycopg://cea_user:cea_password@localhost:5438/cea_db"
    )
    db_schema: str = "control_service"

    # Contrato de ventana (decisiones D11): cadencia, historia y horizonte.
    freq_seconds: int = 60
    window: int = 15          # k
    horizon: int = 6          # H
    channels: int = 4
    metrics: str = DEFAULT_METRICS

    # Capa 3 — state estimator (docs/especificacion.md §5).
    max_gap_steps: int = 3    # huecos > N pasos ⇒ active=0 (no se imputan)
    scaler_name: str = "cea-x"
    metric_bounds: str = ""   # override JSON: '{"co2":[0,50000]}' (opcional)

    # Servicios de predicción (Astaroth, decisión D9).
    astaroth_xgb_url: str = "http://localhost:8011"
    astaroth_transformer_url: str = "http://localhost:8013"
    astaroth_causal_url: str = "http://localhost:8014"
    astaroth_timeout_s: float = 60.0

    # World model causal (Fase 3): run entrenado en causalTransformer-api.
    causal_run_id: str = ""
    causal_model_type: str = "ct"          # ct | crn | edct | gnet | rmsn | msm
    causal_submodel: str = ""
    causal_phases: str = "Vegetativa,Floración,Cosecha"

    @property
    def phase_list(self) -> list[str]:
        return [p.strip() for p in self.causal_phases.split(",") if p.strip()]

    @property
    def metric_list(self) -> list[str]:
        return [m.strip() for m in self.metrics.split(",") if m.strip()]

    @property
    def channel_list(self) -> list[int]:
        return list(range(1, self.channels + 1))

    @property
    def bounds(self) -> dict[str, tuple[float, float]]:
        """Cotas físicas por métrica (defaults + override JSON opcional)."""
        bounds = dict(DEFAULT_METRIC_BOUNDS)
        if self.metric_bounds.strip():
            try:
                override = json.loads(self.metric_bounds)
            except json.JSONDecodeError:
                override = {}
            if isinstance(override, dict):
                for key, value in override.items():
                    if isinstance(value, (list, tuple)) and len(value) == 2:
                        bounds[key] = (float(value[0]), float(value[1]))
        return bounds


@lru_cache
def get_settings() -> Settings:
    return Settings()
