"""Validación de schemas y de la normalización defensiva de DeepSeek."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.integrations.deepseek import extract_json, normalize_phases
from app.schemas.recommendation import RecommendationResponse
from app.schemas.targets import (
    INFORMATIONAL_KEYS,
    PhaseTargets,
    RangeTarget,
    unit_bounds,
)
from app.services.device import compact_targets
from tests.conftest import sample_recommendation


def test_recommendation_roundtrip() -> None:
    rec = sample_recommendation()
    data = rec.model_dump(exclude_none=True)
    again = RecommendationResponse.model_validate(data)
    assert again.phases[0].name == "Germinación"
    assert again.phases[0].targets.temperature.target == 25


def test_recommendation_requires_phases() -> None:
    with pytest.raises(ValidationError):
        RecommendationResponse.model_validate({"summary": "sin fases"})


def test_recommendation_rejects_empty_phases() -> None:
    with pytest.raises(ValidationError):
        RecommendationResponse.model_validate({"phases": []})


def test_incoherent_range_is_rejected() -> None:
    rec = RecommendationResponse.model_validate(
        {
            "phases": [
                {
                    "name": "Vegetativa",
                    "targets": {
                        "temperature": {"min": 30, "target": 20, "max": 40}
                    },
                }
            ]
        }
    )
    with pytest.raises(ValueError):
        rec.phases[0].targets.validate_all_ranges()


def test_extract_json_from_fenced_markdown() -> None:
    content = '```json\n{"phases": [{"name": "X", "targets": {}}]}\n```'
    data = extract_json(content)
    assert data["phases"][0]["name"] == "X"


def test_extract_json_rejects_plain_text() -> None:
    from app.integrations.deepseek import DeepSeekValidationError

    with pytest.raises(DeepSeekValidationError):
        extract_json("esto no es JSON")


def test_normalize_aliases_and_custom_params() -> None:
    raw = {
        "phases": [
            {
                "name": "Vegetativa",
                "targets": {
                    "Temperatura": {"minimo": 20, "objetivo": 24, "maximo": 28},
                    "fotoperiodo": {"light_hours": 16, "dark_hours": 8},
                    "vpd": {"value": 1.2, "unit": "kPa"},
                },
            }
        ]
    }
    data = normalize_phases(raw)
    targets = data["phases"][0]["targets"]
    assert targets["temperature"]["target"] == 24
    assert targets["lighting"]["hours_on"] == 16
    assert "vpd" in targets["custom"]


def test_custom_target_preserves_informational_defaults() -> None:
    targets = PhaseTargets.model_validate(
        {"custom": {"vpd": {"value": 1.2, "unit": "kPa"}}}
    )
    assert targets.custom["vpd"].informational_only is True
    assert targets.custom["vpd"].controllable is False


# --- Validación por unidad (RangeTarget) ---------------------------------


def test_co2_ppm_range_is_accepted() -> None:
    # Antes fallaba con 422 por el tope genérico le=200.
    target = RangeTarget(min=400, target=900, max=1200, unit="ppm")
    assert target.target == 900


def test_co2_without_unit_skips_numeric_bound() -> None:
    target = RangeTarget(min=400, target=900, max=1200)
    assert unit_bounds(None) is None
    assert target.max == 1200


def test_temperature_out_of_physical_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RangeTarget(min=20, target=25, max=999, unit="°C")


def test_humidity_over_100_percent_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RangeTarget(min=0, target=50, max=150, unit="%")


def test_unit_aliases_and_case_insensitivity() -> None:
    assert unit_bounds("PPM") == (0, 50000)
    assert unit_bounds("°C") == (-50, 100)
    assert unit_bounds("%HR") == (0, 100)
    assert unit_bounds("µS/cm") == (0, 50000)
    assert unit_bounds("unidad-desconocida") is None


# --- Default informativo para parámetros sin actuador ---------------------


def test_deviceless_params_are_informational_by_default() -> None:
    # Construido con instancias (como hace el conftest / recomendación).
    targets = PhaseTargets(
        co2=RangeTarget(min=400, target=900, max=1200, unit="ppm")
    )
    assert targets.co2 is not None
    assert targets.co2.controllable is False
    assert targets.co2.informational_only is True


def test_deviceless_params_are_informational_from_dict() -> None:
    # Mismo resultado por la vía de la API (PATCH manual)...
    targets = PhaseTargets.model_validate(
        {"co2": {"min": 400, "target": 900, "max": 1200, "unit": "ppm"}}
    )
    assert targets.co2 is not None
    assert targets.co2.controllable is False
    assert targets.co2.informational_only is True


def test_all_deviceless_keys_get_defaults() -> None:
    raw = {key: {"min": 0, "target": 1, "max": 2} for key in INFORMATIONAL_KEYS}
    targets = PhaseTargets.model_validate(raw)
    for key in INFORMATIONAL_KEYS:
        target = getattr(targets, key)
        assert target is not None, key
        assert target.informational_only is True, key
        assert target.controllable is False, key


def test_explicit_controllable_is_respected() -> None:
    # Hardware que sí controla CO2 puede forzar los flags.
    targets = PhaseTargets.model_validate(
        {
            "co2": {
                "min": 400,
                "target": 900,
                "max": 1200,
                "unit": "ppm",
                "controllable": True,
                "informational_only": False,
            }
        }
    )
    assert targets.co2 is not None
    assert targets.co2.controllable is True
    assert targets.co2.informational_only is False


def test_controllable_params_stay_controllable() -> None:
    targets = PhaseTargets.model_validate(
        {"temperature": {"min": 18, "target": 26, "max": 28, "unit": "°C"}}
    )
    assert targets.temperature is not None
    assert targets.temperature.controllable is True
    assert targets.temperature.informational_only is False


def test_compact_targets_excludes_informational_and_keeps_controllable() -> None:
    targets = PhaseTargets.model_validate(
        {
            "temperature": {"min": 18, "target": 26, "max": 28, "unit": "°C"},
            "co2": {"min": 400, "target": 900, "max": 1200, "unit": "ppm"},
        }
    )
    payload = compact_targets(targets)
    assert "temperature" in payload
    assert "co2" not in payload
