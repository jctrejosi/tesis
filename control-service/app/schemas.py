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


class PredictRequest(BaseModel):
    model: str = "persistence"   # persistence | xgb
    h: int | None = None
    at: datetime | None = None


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
