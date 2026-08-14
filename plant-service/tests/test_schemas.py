"""Validación de schemas y de la normalización defensiva de DeepSeek."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.integrations.deepseek import extract_json, normalize_phases
from app.schemas.recommendation import RecommendationResponse
from app.schemas.targets import PhaseTargets, RangeTarget
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
