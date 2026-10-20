"""Tests del adaptador al contrato de causalTransformer (Fase 3).

No llaman a la red: validan la construcción del payload y el rollout
autoregresivo con un cliente falso.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import Settings
from app.predictors import CausalFormer
from app.state import Window


def _window() -> Window:
    t0 = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    timestamps = [t0 + timedelta(minutes=i) for i in range(4)]
    x = [[20.0 + i, 60.0 - i] for i in range(4)]
    u = [[i % 2, 0] for i in range(4)]          # u0..u3
    d = [[0.1, 0.2, 0.3, 0.4] for _ in range(4)]
    active = [[1, 1], [1, 0], [0, 0], [1, 1]]
    return Window(
        timestamps=timestamps,
        x=x,
        u=u,
        d=d,
        metrics=["temperature", "humidity"],
        channels=[1, 2],
        active=active,
        phase="Vegetativa",
    )


def _predictor(client=None, **kwargs) -> CausalFormer:
    return CausalFormer(
        client,
        "run-test",
        model_type="ct",
        phases=("Vegetativa", "Floración"),
        **kwargs,
    )


def test_payload_shapes_and_alignment() -> None:
    window = _window()
    payload = _predictor().build_payload(window, current_action=[1, 0])

    # batch = 1, k = 4, dim_x = 2
    assert len(payload["prev_outputs"]) == 1
    assert len(payload["prev_outputs"][0]) == 4
    assert len(payload["prev_outputs"][0][0]) == 2

    # prev_treatments = u_0..u_3 ; current_treatments = u_1..u_3 + candidata
    assert payload["prev_treatments"][0] == window.u
    assert payload["current_treatments"][0] == window.u[1:] + [[1, 0]]

    assert payload["vitals"][0] == window.d
    assert payload["static_features"] == [[1.0, 0.0]]
    assert payload["active_entries"][0] == [[1.0], [1.0], [0.0], [1.0]]


def test_default_action_is_last_observed() -> None:
    window = _window()
    payload = _predictor().build_payload(window)
    assert payload["current_treatments"][0][-1] == window.u[-1]


def test_unknown_phase_is_all_zeros() -> None:
    window = _window()
    window.phase = "Desconocida"
    assert _predictor().build_payload(window)["static_features"] == [[0.0, 0.0]]


class _StubClient:
    """Devuelve `prev_outputs[-1] + 1` para verificar el reinyectado."""

    def __init__(self) -> None:
        self.calls = 0

    async def causal_predict(
        self, run_id, model_type, data, n_steps=1, submodel=None
    ) -> dict:
        self.calls += 1
        last = data["prev_outputs"][0][-1]
        return {"predictions": [[[v + 1.0 for v in last]]]}


def test_one_step_returns_last_position() -> None:
    client = _StubClient()
    out = asyncio.run(
        _predictor(client).predict(None, Settings(freq_seconds=60), _window(), 1)
    )
    assert out == [[24.0, 58.0]]  # última x = [23, 57] → +1


def test_rollout_is_autoregressive() -> None:
    client = _StubClient()
    out = asyncio.run(
        _predictor(client).predict(None, Settings(freq_seconds=60), _window(), 3)
    )
    assert client.calls == 3
    assert out == [[24.0, 58.0], [25.0, 59.0], [26.0, 60.0]]


class _FixedClient:
    """Devuelve un valor fijo (simula un run entrenado con objetivo delta)."""

    def __init__(self, values: list[float]) -> None:
        self.values = values

    async def causal_predict(
        self, run_id, model_type, data, n_steps=1, submodel=None
    ) -> dict:
        return {"predictions": [[list(self.values)]]}


def test_delta_target_adds_previous_state() -> None:
    predictor = _predictor(
        _FixedClient([1.0, -2.0]), scaling={"target_mode": "delta"}
    )
    out = asyncio.run(
        predictor.predict(None, Settings(freq_seconds=60), _window(), 1)
    )
    # última x = [23, 57] + Δ [1, -2]
    assert out == [[24.0, 55.0]]


def test_predictions_are_clipped_to_physical_bounds() -> None:
    predictor = _predictor(
        _FixedClient([1.0, -2.0]), scaling={"target_mode": "absolute"}
    )
    out = asyncio.run(
        predictor.predict(None, Settings(freq_seconds=60), _window(), 1)
    )
    # humidity no puede ser negativa (capa 6 v0)
    assert out == [[1.0, 0.0]]
