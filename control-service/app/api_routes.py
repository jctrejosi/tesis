from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from app import registry
from app import effect as effect_mod
from app.clients import AstarothClient, AstarothError
from app.core import database
from app.predictors import (
    AstarothITransformer,
    AstarothXGB,
    Persistence,
    train_transformer,
    train_xgb,
)
from app.schemas import (
    EvaluateRequest,
    EvaluateResponse,
    HealthResponse,
    MetricScore,
    PredictRequest,
    PredictionPoint,
    PredictResponse,
    StateResponse,
    TrainRequest,
    TrainResponse,
)
from app.state import build_window, fetch_actuals, latest_data_time

router = APIRouter()
VERSION = "0.1.0"


async def _anchor(engine, settings, at: datetime | None, back_steps: int = 0) -> datetime | None:
    """Ancla temporal robusta: `at` si se indica, si no el último bucket con datos.

    No usar `now()`: el reloj del entorno puede saltar (visto: 13 min de skew).
    """
    if at is not None:
        return at
    latest = await latest_data_time(engine, settings)
    if latest is None:
        return None
    return latest - timedelta(seconds=settings.freq_seconds * back_steps)


def _settings(request: Request):
    return request.app.state.settings


def _astaroth(request: Request) -> AstarothClient:
    return request.app.state.astaroth


def _engine():
    if database.engine is None:
        raise HTTPException(status_code=503, detail="base de datos no inicializada")
    return database.engine


def _select_predictor(request: Request, name: str):
    if name == "persistence":
        return Persistence()
    if name == "xgb":
        return AstarothXGB(_astaroth(request))
    if name == "transformer":
        return AstarothITransformer(_astaroth(request))
    raise HTTPException(status_code=400, detail=f"modelo desconocido: {name}")


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = _settings(request)
    database_status = "connected"
    try:
        async with _engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        database_status = "error"
    return HealthResponse(
        status="ok",
        service="control-service",
        version=VERSION,
        database=database_status,
        astaroth=await _astaroth(request).health(),
    )


@router.get("/state", response_model=StateResponse, summary="Estado x_t actual")
async def get_state(request: Request, at: datetime | None = None) -> StateResponse:
    settings = _settings(request)
    engine = _engine()
    window = await build_window(engine, settings, await _anchor(engine, settings, at))
    return StateResponse(
        metrics=window.metrics,
        channels=window.channels,
        timestamps=window.timestamps,
        x=window.x,
        u=window.u,
        d=window.d,
        latest=dict(zip(window.metrics, window.latest)),
    )


@router.post("/predict", response_model=PredictResponse, summary="Predecir x_{t+1..t+H}")
async def predict(payload: PredictRequest, request: Request) -> PredictResponse:
    settings = _settings(request)
    horizon = payload.h or settings.horizon
    engine = _engine()
    window = await build_window(engine, settings, await _anchor(engine, settings, payload.at))
    predictor = _select_predictor(request, payload.model)
    try:
        values = await predictor.predict(engine, settings, window, horizon)
    except AstarothError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    base = window.latest_time
    forecast = [
        PredictionPoint(
            t=base + timedelta(seconds=settings.freq_seconds * (i + 1)),
            values=dict(zip(window.metrics, values[i])),
        )
        for i in range(horizon)
    ]
    return PredictResponse(
        model=predictor.name, horizon=horizon, metrics=window.metrics, forecast=forecast
    )


@router.post("/evaluate", response_model=EvaluateResponse, summary="MAE/RMSE por modelo")
async def evaluate(payload: EvaluateRequest, request: Request) -> EvaluateResponse:
    settings = _settings(request)
    horizon = payload.h or settings.horizon
    engine = _engine()
    anchor = await _anchor(engine, settings, payload.at, back_steps=horizon + 1)
    window = await build_window(engine, settings, anchor)
    actuals = await fetch_actuals(engine, settings, window.latest_time, horizon)
    dh = registry.dataset_hash(window)

    results: dict[str, dict[str, MetricScore]] = {}
    for name in payload.models:
        predictor = _select_predictor(request, name)
        try:
            values = await predictor.predict(engine, settings, window, horizon)
        except AstarothError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        scores: dict[str, MetricScore] = {}
        for j, metric in enumerate(window.metrics):
            errors = [
                values[i][j] - actuals[i][j]
                for i in range(horizon)
                if actuals[i][j] is not None
            ]
            if not errors:
                continue
            scores[metric] = MetricScore(
                mae=sum(abs(e) for e in errors) / len(errors),
                rmse=(sum(e * e for e in errors) / len(errors)) ** 0.5,
            )
        results[predictor.name] = scores
        await registry.record(
            settings,
            name=predictor.name,
            version=dh,
            kind="baseline",
            dataset_hash_value=dh,
            horizon=horizon,
            metrics={k: v.model_dump() for k, v in scores.items()},
        )

    return EvaluateResponse(
        at=window.latest_time, horizon=horizon, dataset_hash=dh, results=results
    )


@router.post("/train", response_model=TrainResponse, summary="Entrenar baselines en Astaroth")
async def train(payload: TrainRequest, request: Request) -> TrainResponse:
    settings = _settings(request)
    engine = _engine()
    until = payload.until or await latest_data_time(engine, settings) or datetime.now(timezone.utc)
    since = payload.since or (until - timedelta(hours=2))
    try:
        if payload.kind == "transformer":
            outcome = await train_transformer(
                _astaroth(request), settings, engine, since, until, payload.prefix
            )
            models = [outcome["model"]]
        else:
            trained = await train_xgb(
                _astaroth(request), settings, engine, since, until, payload.prefix
            )
            outcome = trained
            models = trained["models"]
    except AstarothError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TrainResponse(prefix=payload.prefix, rows=outcome["rows"], models=models)


@router.get("/registry", summary="Modelos registrados (versión + dataset_hash)")
async def get_registry(request: Request) -> list[dict]:
    return await registry.list_models(_engine(), _settings(request))


@router.get("/effect", summary="Matriz de efecto canal→variable (aprendida)")
async def get_effect(request: Request, hours: int = 24) -> dict:
    settings = _settings(request)
    result = await effect_mod.estimate(_engine(), settings, hours)
    await registry.record(
        settings,
        name="effect_matrix",
        version="v1",
        kind="artifact",
        dataset_hash_value=None,
        horizon=None,
        metrics=result["matrix"],
    )
    return result
