"""Tests del re-muestreo de la capa 3: imputación acotada, máscaras y outliers."""

from __future__ import annotations

from app.state import resample_metric


def test_short_gap_is_imputed_and_active() -> None:
    series = resample_metric([10.0, None, None, None], bounds=(0, 100), max_gap=3)
    assert series.values == [10.0, 10.0, 10.0, 10.0]
    assert series.active == [1, 1, 1, 1]
    assert series.observed == [1, 0, 0, 0]


def test_long_gap_is_marked_inactive() -> None:
    # 5 huecos consecutivos con max_gap=3 ⇒ los 3 primeros usables, el resto no.
    series = resample_metric([7.0, None, None, None, None, None], max_gap=3)
    assert series.values == [7.0] * 6
    assert series.active == [1, 1, 1, 1, 0, 0]
    assert series.observed == [1, 0, 0, 0, 0, 0]


def test_missing_before_first_value_is_inactive_default() -> None:
    series = resample_metric([None, None, 4.0], default=0.0)
    assert series.values == [0.0, 0.0, 4.0]
    assert series.active == [0, 0, 1]


def test_out_of_range_value_counts_as_gap() -> None:
    series = resample_metric([20.0, 9999.0, 21.0], bounds=(0, 100), max_gap=3)
    assert series.values == [20.0, 20.0, 21.0]   # el outlier no pasa
    assert series.observed == [1, 0, 1]
    assert series.active == [1, 1, 1]


def test_bounds_none_keeps_every_value() -> None:
    series = resample_metric([-5.0, 99999.0], bounds=None)
    assert series.values == [-5.0, 99999.0]
    assert series.active == [1, 1]
