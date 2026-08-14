from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.targets import PhaseTargets


# ─── Cultivos ──────────────────────────────────────────────────────────────

class CropCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    species: str = Field(min_length=1, max_length=120)
    variety: str | None = Field(default=None, max_length=120)
    location: str | None = None
    growing_system: str | None = None
    notes: str | None = None


class CropUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    species: str | None = Field(default=None, min_length=1, max_length=120)
    variety: str | None = Field(default=None, max_length=120)
    location: str | None = None
    growing_system: str | None = None
    notes: str | None = None


class CropRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    species: str
    variety: str | None
    location: str | None
    growing_system: str | None
    notes: str | None
    active_phase_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


# ─── Fases ─────────────────────────────────────────────────────────────────

class PhaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    order: int | None = None
    targets: PhaseTargets | None = None


class PhaseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    order: int | None = None
    targets: PhaseTargets | None = None


class PhaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    order: int
    is_active: bool
    targets: PhaseTargets | None
    recommended_targets: PhaseTargets | None
    is_modified: bool
    created_at: datetime
    updated_at: datetime


class CropDetail(CropRead):
    phases: list[PhaseRead] = Field(default_factory=list)


# ─── Recomendación ─────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    """Contexto adicional opcional para la consulta a DeepSeek."""

    extra_context: str | None = None


class PhaseApplyResult(BaseModel):
    phase_id: uuid.UUID
    name: str
    created: bool
    recommendation_updated: bool
    targets_preserved: bool


class RecommendResult(BaseModel):
    recommendation_id: uuid.UUID
    model: str
    summary: str | None
    notes: list[str]
    phases: list[PhaseApplyResult]
