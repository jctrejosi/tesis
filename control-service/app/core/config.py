from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Conjunto núcleo del vector de estado x_t (docs/datos.md §1.2).
DEFAULT_METRICS = (
    "temperature,humidity,pressure,co2,ec,vpd,dew_point,ndvi,par,ec_compensated"
)


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

    # Servicios de predicción (Astaroth, decisión D9).
    astaroth_xgb_url: str = "http://localhost:8011"
    astaroth_transformer_url: str = "http://localhost:8013"
    astaroth_timeout_s: float = 60.0

    @property
    def metric_list(self) -> list[str]:
        return [m.strip() for m in self.metrics.split(",") if m.strip()]

    @property
    def channel_list(self) -> list[int]:
        return list(range(1, self.channels + 1))


@lru_cache
def get_settings() -> Settings:
    return Settings()
