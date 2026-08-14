from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.targets import PhaseTargets


class PhaseRecommendation(BaseModel):
    """Una fase propuesta por DeepSeek con sus objetivos."""

    name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    targets: PhaseTargets = Field(default_factory=PhaseTargets)


class RecommendationResponse(BaseModel):
    """Respuesta completa del modelo, validada estrictamente. Cualquier
    estructura que no cumpla este schema se rechaza."""

    model_config = ConfigDict(extra="ignore")

    phases: list[PhaseRecommendation] = Field(min_length=1, max_length=12)
    summary: str | None = None
    notes: list[str] = Field(default_factory=list)
