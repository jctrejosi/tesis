"""Tests de la matriz de efecto y del contexto temporal."""

from __future__ import annotations

from datetime import datetime, timezone

from app.effect import compute_effect_matrix, rank_effects
from app.state import context_vector


def _rows(n_off: int, n_on: int) -> list[dict]:
    rows = []
    for _ in range(n_off):
        rows.append({"u1": 0, "u2": 0, "temperature": 20.0, "humidity": 60.0})
    for _ in range(n_on):
        rows.append({"u1": 1, "u2": 0, "temperature": 25.0, "humidity": 50.0})
    return rows


def test_effect_detects_sign_and_magnitude() -> None:
    matrix = compute_effect_matrix(_rows(10, 10), ["temperature", "humidity"], [1, 2])
    temp = matrix["1"]["temperature"]
    hum = matrix["1"]["humidity"]
    assert temp["delta"] > 0 and temp["effect"] > 0
    assert hum["delta"] < 0 and hum["effect"] < 0
    assert temp["n_on"] == 10 and temp["n_off"] == 10


def test_channel_without_variation_reports_none() -> None:
    matrix = compute_effect_matrix(_rows(10, 10), ["temperature"], [2])
    assert matrix["2"]["temperature"] is None


def test_insufficient_samples_reports_none() -> None:
    matrix = compute_effect_matrix(_rows(10, 1), ["temperature"], [1])
    assert matrix["1"]["temperature"] is None


def test_ranking_orders_by_abs_effect() -> None:
    matrix = compute_effect_matrix(_rows(10, 10), ["temperature"], [1])
    ranking = rank_effects(matrix)
    assert ranking["temperature"][0]["channel"] == 1


def test_context_vector_is_cyclic_and_bounded() -> None:
    vector = context_vector(datetime(2026, 9, 30, 12, 0, tzinfo=timezone.utc))
    assert len(vector) == 4
    assert all(-1.0 <= value <= 1.0 for value in vector)
