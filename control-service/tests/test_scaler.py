"""Tests del scaler z-score compartido (capa 3, D12)."""

from __future__ import annotations

from app.scaler import fit


def _rows() -> list[dict]:
    return [
        {"temperature": 20.0, "humidity": 60.0},
        {"temperature": 22.0, "humidity": 64.0},
        {"temperature": 24.0, "humidity": 56.0},
        {"temperature": 21.0, "humidity": 58.0},
        {"temperature": 23.0, "humidity": 62.0},
    ]


def test_fit_computes_mean_and_std() -> None:
    scaler = fit(_rows(), ["temperature", "humidity"], name="t")
    assert scaler.mean["temperature"] == 22.0
    assert scaler.samples == 5
    assert scaler.std["temperature"] > 0


def test_normalize_produces_zero_mean_unit_scale() -> None:
    scaler = fit(_rows(), ["temperature"], name="t")
    z = [scaler.normalize_row([r["temperature"]])[0] for r in _rows()]
    assert abs(sum(z) / len(z)) < 1e-9
    # El valor máximo (24) queda a (24-22)/std desviaciones de la media.
    assert abs(max(z) - (24.0 - 22.0) / scaler.std["temperature"]) < 1e-9


def test_constant_variable_does_not_divide_by_zero() -> None:
    rows = [{"x": 5.0}, {"x": 5.0}, {"x": 5.0}]
    scaler = fit(rows, ["x"], name="t")
    assert scaler.std["x"] == 1.0
    assert scaler.normalize_row([5.0]) == [0.0]


def test_version_is_reproducible() -> None:
    a = fit(_rows(), ["temperature", "humidity"], name="t")
    b = fit(_rows(), ["temperature", "humidity"], name="t")
    assert a.version == b.version


def test_version_changes_with_data() -> None:
    a = fit(_rows(), ["temperature"], name="t")
    b = fit(_rows()[:3], ["temperature"], name="t")
    assert a.version != b.version


def test_denormalize_roundtrips() -> None:
    scaler = fit(_rows(), ["temperature", "humidity"], name="t")
    row = [22.0, 60.0]
    assert scaler.denormalize_row(scaler.normalize_row(row)) == row
