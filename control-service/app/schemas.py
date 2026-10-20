from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str
    astaroth: dict[str, Any] = Field(default_factory=dict)


class StateResponse(BaseModel):
    metrics: list[str]
    channels: list[int]
    timestamps: list[datetime]
    x: list[list[float]]
    u: list[list[int]]
    d: list[list[float]]
    latest: dict[str, float]
    active: list[list[int]] = Field(default_factory=list)    # máscara active_entries
    observed: list[list[int]] = Field(default_factory=list)  # 1 = medido (no imputado)
    z: list[list[float]] | None = None                       # x normalizado (scaler)
    x_target: dict[str, Any] | None = None                   # x* (setpoints)
    phase: str | None = None


class ScalerResponse(BaseModel):
    name: str
    version: str
    metrics: list[str]
    mean: dict[str, float]
    std: dict[str, float]
    samples: int
    dataset_hash: str | None = None
    created_at: datetime | None = None


class ScalerFitRequest(BaseModel):
    name: str | None = None
    since: datetime | None = None   # inicio del histórico de ajuste
    until: datetime | None = None   # fin del histórico de ajuste
    hours: int = 6                  # usado si no se da `since`


class PredictRequest(BaseModel):
    model: str = "persistence"   # persistence | xgb | transformer | causal
    h: int | None = None
    at: datetime | None = None
    # Parámetros del world model causal (model="causal").
    run_id: str | None = None
    model_type: str | None = None   # ct | crn | edct | gnet | rmsn | msm
    submodel: str | None = None
    current_action: list[int] | None = None


class PredictionPoint(BaseModel):
    t: datetime
    values: dict[str, float]


class PredictResponse(BaseModel):
    model: str
    horizon: int
    metrics: list[str]
    forecast: list[PredictionPoint]


class EvaluateRequest(BaseModel):
    models: list[str] = Field(default_factory=lambda: ["persistence", "xgb"])
    h: int | None = None
    at: datetime | None = None


class MetricScore(BaseModel):
    mae: float
    rmse: float


class EvaluateResponse(BaseModel):
    at: datetime
    horizon: int
    dataset_hash: str
    results: dict[str, dict[str, MetricScore]]


class TrainRequest(BaseModel):
    since: datetime | None = None   # inicio del histórico
    until: datetime | None = None   # fin del histórico
    prefix: str = "cea"
    kind: str = "xgb"               # xgb | transformer


class TrainResponse(BaseModel):
    prefix: str
    rows: int
    models: list[dict[str, Any]]
