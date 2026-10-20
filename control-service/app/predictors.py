"""Predictores del world model (capa 4, parte barata).

Interfaz común: `predict(engine, settings, window, horizon) -> [H][dim_x]`.
- `Persistence`: `x_{t+1} = x_t` (baseline mínimo).
- `AstarothXGB`: baseline por variable vía `Astaroth/XGBoost-api` (D9).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncEngine

from app.clients import AstarothClient
from app.core.config import Settings
from app.state import Window, build_rows, context_vector


class Predictor(Protocol):
    name: str

    async def predict(
        self,
        engine: AsyncEngine,
        settings: Settings,
        window: Window,
        horizon: int,
    ) -> list[list[float]]: ...


class Persistence:
    """Baseline trivial: el estado no cambia."""

    name = "persistence"

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        last = window.latest
        return [list(last) for _ in range(horizon)]


class AstarothXGB:
    """Baseline sólido: un modelo XGBoost por variable servido por Astaroth."""

    name = "xgb"

    def __init__(self, client: AstarothClient, prefix: str = "cea") -> None:
        self._client = client
        self._prefix = prefix

    def model_name(self, metric: str) -> str:
        return f"{self._prefix}:{metric}"

    async def _history_rows(
        self, engine: AsyncEngine, settings: Settings, window: Window, rows: int = 60
    ) -> list[dict]:
        end = window.latest_time or datetime.now(timezone.utc)
        start = end - timedelta(seconds=settings.freq_seconds * (rows - 1))
        return await build_rows(engine, settings, start, end)

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        history = await self._history_rows(engine, settings, window)
        per_metric: list[list[float]] = []
        for metric in window.metrics:
            result = await self._client.xgb_predict(
                self.model_name(metric), horizon, history
            )
            points = result.get("predictions", [])
            per_metric.append([float(p["value"]) for p in points])
        # [dim_x][H] → [H][dim_x]
        return [
            [per_metric[j][i] for j in range(len(window.metrics))]
            for i in range(horizon)
        ]


async def train_xgb(
    client: AstarothClient,
    settings: Settings,
    engine: AsyncEngine,
    start: datetime,
    end: datetime,
    prefix: str = "cea",
) -> list[dict]:
    """Entrena un modelo XGBoost por métrica en Astaroth. Devuelve las métricas."""
    rows = await build_rows(engine, settings, start, end)
    if len(rows) < 30:
        raise ValueError(
            f"histórico insuficiente para entrenar ({len(rows)} filas); amplía el rango"
        )
    results = []
    for metric in settings.metric_list:
        res = await client.xgb_train(f"{prefix}:{metric}", metric, rows)
        results.append({"metric": metric, **res})
    return {"rows": len(rows), "models": results}


class AstarothITransformer:
    """iTransformer (forecast **pasivo** seq→seq; sin acciones, D9).

    Se le envía solo el estado `x` (no `u`), así que predice "qué pasaría sin
    actuar": sirve de comparación y de predictor de contexto.
    """

    name = "transformer"

    def __init__(self, client: AstarothClient, prefix: str = "cea") -> None:
        self._client = client
        self._prefix = prefix

    def model_name(self) -> str:
        return f"{self._prefix}:it"

    async def predict(self, engine, settings, window, horizon) -> list[list[float]]:
        end = window.latest_time or datetime.now(timezone.utc)
        start = end - timedelta(seconds=settings.freq_seconds * 47)
        rows = await build_rows(engine, settings, start, end)
        history = [
            {k: row[k] for k in ("date", *settings.metric_list)} for row in rows
        ]
        result = await self._client.transformer_predict(
            self.model_name(), horizon, history
        )
        forecast = result.get("forecast", [])
        return [
            [float(point[m]) for m in settings.metric_list] for point in forecast
        ]


async def train_transformer(
    client: AstarothClient,
    settings: Settings,
    engine: AsyncEngine,
    start: datetime,
    end: datetime,
    prefix: str = "cea",
) -> dict:
    """Entrena el iTransformer (multivariante, solo `x`) en Astaroth."""
    rows = await build_rows(engine, settings, start, end)
    history = [{k: row[k] for k in ("date", *settings.metric_list)} for row in rows]
    if len(history) < 40:
        raise ValueError(
            f"histórico insuficiente para iTransformer ({len(history)} filas)"
        )
    result = await client.transformer_train(f"{prefix}:it", history)
    return {"rows": len(history), "model": result}


class CausalFormer:
    """World model causal (`causalTransformer-api`, :8014) — Fase 3.

    Traduce `Window` (estado de la tesis) al contrato del dataset del upstream:

    | Payload              | Origen          | Forma        |
    |----------------------|-----------------|--------------|
    | `prev_outputs`       | `x` (historia)  | `[1,k,dim_x]`|
    | `prev_treatments`    | `u[0..k-1]`     | `[1,k,dim_u]`|
    | `current_treatments` | `u[1..k]`       | `[1,k,dim_u]`|
    | `vitals`             | `d_t`           | `[1,k,dim_d]`|
    | `static_features`    | fase (one-hot)  | `[1,dim_s]`  |
    | `active_entries`     | máscara         | `[1,k,1]`    |

    Alineación (la del upstream): `prev_outputs[:, :-1]` y
    `current_treatments[:, 1:]`; el tratamiento en `j+1` explica el outcome en
    `j+1`. Por eso `current_treatments` es `u` desplazado un paso y su último
    elemento es la **acción candidata** a evaluar (por defecto, la última
    observada). La predicción de la última posición corresponde a `x_{t+1}`.

    Nota: la API **no normaliza entradas** (solo desnormaliza la salida con
    `scaling_params`). Si el modelo se entrenó con un scaler, hay que aplicar
    ese mismo scaler a `x`/`d` antes de enviar (fase 4, decisión D12).
    """

    name = "causal"

    def __init__(
        self,
        client: AstarothClient,
        run_id: str,
        model_type: str = "ct",
        submodel: str | None = None,
        phases: tuple[str, ...] | list[str] = (),
        include_vitals: bool = True,
        current_action: list[int] | None = None,
        scaling: dict | None = None,
    ) -> None:
        self._client = client
        self.run_id = run_id
        self.model_type = model_type
        self.submodel = submodel
        self.phases = list(phases)
        self.include_vitals = include_vitals
        self._current_action = list(current_action) if current_action is not None else None
        self._scaling = scaling
        self._bounds: dict[str, tuple[float, float]] | None = None

    async def _ensure_scaling(self) -> None:
        """Carga (una vez) el scaler del run desde el API causal."""
        if self._scaling is not None:
            return
        if not hasattr(self._client, "causal_scaling"):
            self._scaling = {}
            return
        self._scaling = await self._client.causal_scaling(self.run_id)

    def _static_features(self, phase: str | None) -> list[float]:
        """One-hot de la fase; fase desconocida ⇒ todo ceros."""
        return [1.0 if phase == p else 0.0 for p in self.phases]

    def _clip(self, values: list[float], metrics: list[str]) -> list[float]:
        """Recorta a cotas físicas (capa 6 v0).

        El world model puede producir valores imposibles (p. ej. `par`
        negativo) al hacer rollout; se recortan al rango de `unit_bounds`
        antes de devolverlos. La capa de seguridad formal llega en fase 4.
        """
        if not self._bounds:
            return values
        out: list[float] = []
        for value, metric in zip(values, metrics):
            bounds = self._bounds.get(metric)
            out.append(min(max(value, bounds[0]), bounds[1]) if bounds else value)
        return out

    def _normalize(self, rows: list[list[float]], metrics: list[str]) -> list[list[float]]:
        """Aplica el scaler del run a las entradas (la API no normaliza entradas)."""
        if not self._scaling:
            return [[float(v) for v in row] for row in rows]
        means = self._scaling.get("input_means")
        stds = self._scaling.get("input_stds")
        if not means or not stds or len(means) != len(metrics):
            return [[float(v) for v in row] for row in rows]
        return [
            [(float(v) - m) / (s if s else 1.0) for v, m, s in zip(row, means, stds)]
            for row in rows
        ]

    def build_payload(
        self, window: Window, current_action: list[int] | None = None
    ) -> dict:
        """Construye el `data` con dimensión de lote (batch = 1)."""
        k = len(window.x)
        dim_u = len(window.channels)
        actions = [[int(v) for v in row] for row in window.u]
        if len(actions) != k:
            actions = ([[0] * dim_u for _ in range(k)])

        candidate = (
            [int(v) for v in current_action]
            if current_action is not None
            else (actions[-1] if actions else [0] * dim_u)
        )
        # u_{0..k} con la acción candidata en el paso k.
        treatments = actions + [candidate]
        prev_treatments = treatments[:k]
        current_treatments = treatments[1 : k + 1]

        if window.active and len(window.active) == k:
            active = [1.0 if any(row) else 0.0 for row in window.active]
        else:
            active = [1.0] * k

        data: dict = {
            "prev_outputs": [self._normalize(window.x, window.metrics)],
            "prev_treatments": [prev_treatments],
            "current_treatments": [current_treatments],
            "static_features": [self._static_features(window.phase)],
            "active_entries": [[[a] for a in active]],
        }
        if self.include_vitals:
            data["vitals"] = [[[float(v) for v in row] for row in window.d]]
        return data

    async def _one(
        self,
        window: Window,
        current_action: list[int] | None = None,
    ) -> list[float]:
        data = self.build_payload(window, current_action)
        result = await self._client.causal_predict(
            self.run_id, self.model_type, data, 1, self.submodel
        )
        predictions = result.get("predictions") or []
        if not predictions or not predictions[0]:
            raise AstarothError("causal: respuesta sin 'predictions'")
        last = predictions[0][-1]
        if len(last) != len(window.metrics):
            raise AstarothError(
                "causal: dimensión de salida "
                f"{len(last)} != dim_x {len(window.metrics)} "
                "(¿el run se entrenó con otro contrato de métricas?)"
            )
        pred = [float(v) for v in last]
        if (self._scaling or {}).get("target_mode") == "delta":
            # El run predice Δx en unidades originales (la API ya desnormalizó);
            # se reconstruye x_{t+1} = x_t + Δx.
            pred = [p + float(b) for p, b in zip(pred, window.x[-1])]
        return self._clip(pred, window.metrics)

    async def _rollout(
        self,
        settings: Settings,
        window: Window,
        horizon: int,
        actions: list[list[int]] | None = None,
    ) -> list[list[float]]:
        """Rollout autoregresivo en el cliente (una llamada 1-step por paso).

        La API solo hace n-step nativo para decoders (CRN/EDCT/RMSN); para CT
        este bucle reinyecta la predicción en `prev_outputs` y avanza `u`/`d`.
        """
        x = [[float(v) for v in row] for row in window.x]
        u = [[int(v) for v in row] for row in window.u]
        d = [[float(v) for v in row] for row in window.d]
        active = (
            [list(row) for row in window.active]
            if window.active
            else [[1] * len(window.metrics) for _ in range(len(x))]
        )
        timestamps = list(window.timestamps)
        k = len(x)
        base_action = (
            self._current_action if self._current_action is not None else u[-1]
        )

        out: list[list[float]] = []
        for step in range(horizon):
            current = Window(
                timestamps=list(timestamps),
                x=[list(row) for row in x],
                u=[list(row) for row in u],
                d=[list(row) for row in d],
                metrics=window.metrics,
                channels=window.channels,
                active=[list(row) for row in active],
                x_target=window.x_target,
                phase=window.phase,
            )
            action = actions[step] if actions and step < len(actions) else base_action
            pred = await self._one(current, action)
            out.append(pred)

            new_ts = timestamps[-1] + timedelta(seconds=settings.freq_seconds)
            x = (x + [pred])[-k:]
            u = (u + [[int(v) for v in action]])[-k:]
            d = (d + [context_vector(new_ts)])[-k:]
            active = (active + [[1] * len(window.metrics)])[-k:]
            timestamps = (timestamps + [new_ts])[-k:]
        return out

    async def predict(
        self,
        engine,
        settings: Settings,
        window: Window,
        horizon: int,
    ) -> list[list[float]]:
        await self._ensure_scaling()
        self._bounds = settings.bounds
        if horizon <= 1:
            return [await self._one(window, self._current_action)]
        return await self._rollout(settings, window, horizon)
