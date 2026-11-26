from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración del servicio. Todas las variables se leen del entorno
    (o de un archivo .env en el directorio de trabajo). Los secretos
    (DEEPSEEK_API_KEY, DEVICE_API_KEY) nunca se exponen en respuestas."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "plant-service"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    # Base de datos compartida del proyecto (TimescaleDB) con esquema propio.
    database_url: str = (
        "postgresql+psycopg://cea_user:cea_password@localhost:5433/cea_db"
    )
    db_schema: str = "plant_service"

    # CORS: orígenes separados por coma.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_timeout_seconds: float = 30.0

    # Clave compartida para los endpoints del dispositivo (ESP).
    device_api_key: str = ""

    # ── Servicio RAG compartido (Paimon) ──
    # URL base del rag_service. Vacía ⇒ los endpoints /catalog devuelven 503 y
    # las recomendaciones no se fundamentan en catálogos.
    rag_service_url: str = ""
    # Clave compartida (X-API-Key) del servicio RAG, si exige autenticación.
    rag_service_api_key: str = ""
    # Namespace (`bot_id`) propio de plant-service dentro del servicio RAG.
    rag_namespace: str = "plant-service"
    # Proyecto (espacio físico aislado) dentro del servicio RAG.
    rag_project: str = "tesis"
    rag_timeout_seconds: float = 30.0
    # Nº de fragmentos que se inyectan como contexto en las recomendaciones.
    rag_context_chunks: int = 3

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def deepseek_enabled(self) -> bool:
        return bool(self.deepseek_api_key.strip())

    @property
    def rag_enabled(self) -> bool:
        return bool(self.rag_service_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
