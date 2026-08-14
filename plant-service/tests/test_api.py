"""Flujo completo de la API: cultivos, fases, recomendación y dispositivo."""

from __future__ import annotations

from app.integrations.deepseek import (
    DeepSeekUnavailableError,
    DeepSeekValidationError,
)
from tests.conftest import DEVICE_HEADERS, Env, sample_recommendation


async def _create_crop(env: Env, species: str = "tomate") -> dict:
    response = await env.client.post(
        "/api/v1/crops",
        json={
            "name": "Tomates del invernadero 1",
            "species": species,
            "variety": "cherry",
            "location": "Invernadero 1",
            "growing_system": "sustrato",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


# ─── Cultivos ──────────────────────────────────────────────────────────────

async def test_create_and_list_crops(env: Env) -> None:
    created = await _create_crop(env)
    assert created["species"] == "tomate"

    response = await env.client.get("/api/v1/crops")
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) == 1
    assert crops[0]["id"] == created["id"]


async def test_update_and_delete_crop(env: Env) -> None:
    created = await _create_crop(env)

    patched = await env.client.patch(
        f"/api/v1/crops/{created['id']}", json={"variety": "raf"}
    )
    assert patched.status_code == 200
    assert patched.json()["variety"] == "raf"

    deleted = await env.client.delete(f"/api/v1/crops/{created['id']}")
    assert deleted.status_code == 204

    gone = await env.client.get(f"/api/v1/crops/{created['id']}")
    assert gone.status_code == 404


async def test_unknown_crop_returns_404(env: Env) -> None:
    response = await env.client.get("/api/v1/crops/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


# ─── Fases ─────────────────────────────────────────────────────────────────

async def test_phase_crud_and_activation(env: Env) -> None:
    crop = await _create_crop(env)

    # Primera fase creada: queda activa automáticamente.
    p1 = await env.client.post(
        f"/api/v1/crops/{crop['id']}/phases",
        json={"name": "Vegetativa", "description": "Crecimiento"},
    )
    assert p1.status_code == 201, p1.text
    phase1 = p1.json()
    assert phase1["is_active"] is True

    p2 = await env.client.post(
        f"/api/v1/crops/{crop['id']}/phases", json={"name": "Floración"}
    )
    assert p2.status_code == 201
    phase2 = p2.json()
    assert phase2["is_active"] is False

    # Activar la segunda fase.
    detail = await env.client.post(
        f"/api/v1/crops/{crop['id']}/phases/{phase2['id']}/activate"
    )
    assert detail.status_code == 200
    phases = detail.json()["phases"]
    by_id = {p["id"]: p for p in phases}
    assert by_id[phase2["id"]]["is_active"] is True
    assert by_id[phase1["id"]]["is_active"] is False
    assert detail.json()["active_phase_id"] == phase2["id"]

    # Editar parámetros manualmente.
    updated = await env.client.patch(
        f"/api/v1/crops/{crop['id']}/phases/{phase1['id']}",
        json={
            "targets": {
                "temperature": {"min": 21, "target": 25, "max": 29, "unit": "°C"}
            }
        },
    )
    assert updated.status_code == 200
    assert updated.json()["targets"]["temperature"]["target"] == 25

    # Eliminar la fase activa deja el cultivo sin fase activa.
    deleted = await env.client.delete(
        f"/api/v1/crops/{crop['id']}/phases/{phase2['id']}"
    )
    assert deleted.status_code == 204
    detail = await env.client.get(f"/api/v1/crops/{crop['id']}")
    assert detail.json()["active_phase_id"] is None


async def test_phase_merge_preserves_unset_fields(env: Env) -> None:
    crop = await _create_crop(env)
    created = await env.client.post(
        f"/api/v1/crops/{crop['id']}/phases",
        json={
            "name": "Vegetativa",
            "targets": {
                "temperature": {
                    "min": 20, "target": 24, "max": 28, "unit": "°C",
                    "reason": "crecimiento",
                }
            },
        },
    )
    phase_id = created.json()["id"]

    # Solo se envía el target: min/max/reason deben conservarse.
    updated = await env.client.patch(
        f"/api/v1/crops/{crop['id']}/phases/{phase_id}",
        json={"targets": {"temperature": {"target": 26}}},
    )
    temperature = updated.json()["targets"]["temperature"]
    assert temperature["target"] == 26
    assert temperature["min"] == 20
    assert temperature["max"] == 28
    assert temperature["reason"] == "crecimiento"


# ─── Recomendación DeepSeek ────────────────────────────────────────────────

async def test_recommend_creates_phases_and_activates_first(env: Env) -> None:
    crop = await _create_crop(env)

    response = await env.client.post(
        f"/api/v1/crops/{crop['id']}/recommend", json={}
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert len(result["phases"]) == 3
    assert all(p["created"] for p in result["phases"])
    assert result["model"] == "deepseek-chat"

    # El cultivo quedó con la primera fase activa y sus objetivos.
    detail = await env.client.get(f"/api/v1/crops/{crop['id']}")
    phases = detail.json()["phases"]
    active = [p for p in phases if p["is_active"]]
    assert len(active) == 1
    assert active[0]["name"] == "Germinación"
    assert active[0]["targets"]["temperature"]["target"] == 25

    # El input enviado a DeepSeek contiene los datos del cultivo.
    assert env.fake_deepseek.calls[-1]["species"] == "tomate"
    assert env.fake_deepseek.calls[-1]["variety"] == "cherry"


async def test_recommend_never_overwrites_manual_config(env: Env) -> None:
    crop = await _create_crop(env)

    first = await env.client.post(f"/api/v1/crops/{crop['id']}/recommend", json={})
    assert first.status_code == 200

    # El usuario modifica manualmente la fase Vegetativa.
    detail = await env.client.get(f"/api/v1/crops/{crop['id']}")
    vegetativa = next(p for p in detail.json()["phases"] if p["name"] == "Vegetativa")
    manual = await env.client.patch(
        f"/api/v1/crops/{crop['id']}/phases/{vegetativa['id']}",
        json={"targets": {"temperature": {"target": 30}}},
    )
    assert manual.status_code == 200

    # Nueva recomendación con un valor distinto para el target.
    env.fake_deepseek.response = sample_recommendation(veg_target=26.0)
    second = await env.client.post(f"/api/v1/crops/{crop['id']}/recommend", json={})
    assert second.status_code == 200
    vegetativa_result = next(
        p for p in second.json()["phases"] if p["name"] == "Vegetativa"
    )
    assert vegetativa_result["targets_preserved"] is True

    detail = await env.client.get(f"/api/v1/crops/{crop['id']}")
    vegetativa = next(p for p in detail.json()["phases"] if p["name"] == "Vegetativa")
    assert vegetativa["targets"]["temperature"]["target"] == 30  # manual, intacto
    assert vegetativa["recommended_targets"]["temperature"]["target"] == 26.0
    assert vegetativa["is_modified"] is True


async def test_recommend_handles_deepseek_errors(env: Env) -> None:
    crop = await _create_crop(env)

    env.fake_deepseek.error = DeepSeekValidationError("respuesta sin fases válidas")
    response = await env.client.post(f"/api/v1/crops/{crop['id']}/recommend", json={})
    assert response.status_code == 502
    assert response.json()["detail"] == "respuesta sin fases válidas"

    env.fake_deepseek.error = DeepSeekUnavailableError("sin API key")
    response = await env.client.post(f"/api/v1/crops/{crop['id']}/recommend", json={})
    assert response.status_code == 503

    # Nada se persistió: el cultivo sigue sin fases.
    detail = await env.client.get(f"/api/v1/crops/{crop['id']}")
    assert detail.json()["phases"] == []


# ─── Dispositivo (ESP) ─────────────────────────────────────────────────────

async def test_device_endpoints_require_api_key(env: Env) -> None:
    response = await env.client.get("/api/v1/device/config")
    assert response.status_code == 401

    response = await env.client.get(
        "/api/v1/device/config", headers={"X-API-Key": "clave-incorrecta"}
    )
    assert response.status_code == 401


async def test_device_config_reflects_active_phase(env: Env) -> None:
    crop = await _create_crop(env)
    await env.client.post(f"/api/v1/crops/{crop['id']}/recommend", json={})

    response = await env.client.get("/api/v1/device/config", headers=DEVICE_HEADERS)
    assert response.status_code == 200
    config = response.json()
    assert config["current_phase"] == "Germinación"
    assert config["crop"] == "Tomates del invernadero 1"
    assert config["targets"]["temperature"] == {
        "min": 20, "target": 25, "max": 28, "unit": "°C",
    }
    assert config["targets"]["lighting"]["enabled"] is True
    assert config["targets"]["lighting"]["hours_on"] == 16
    assert config["targets"]["irrigation"]["duration_seconds"] == 30
    assert len(config["version"]) == 16

    targets = await env.client.get("/api/v1/device/targets", headers=DEVICE_HEADERS)
    assert targets.status_code == 200
    assert targets.json()["phase"] == "Germinación"

    current = await env.client.get(
        "/api/v1/device/current-phase", headers=DEVICE_HEADERS
    )
    assert current.json() == {
        "phase": "Germinación",
        "crop": "Tomates del invernadero 1",
        "active": True,
        "updated_at": current.json()["updated_at"],
    }


async def test_device_config_without_active_phase(env: Env) -> None:
    response = await env.client.get("/api/v1/device/config", headers=DEVICE_HEADERS)
    assert response.status_code == 200
    config = response.json()
    assert config["current_phase"] is None
    assert config["targets"] == {}

    current = await env.client.get(
        "/api/v1/device/current-phase", headers=DEVICE_HEADERS
    )
    assert current.json()["active"] is False


async def test_device_telemetry_roundtrip(env: Env) -> None:
    response = await env.client.post(
        "/api/v1/device/telemetry",
        headers=DEVICE_HEADERS,
        json={
            "device_id": "esp32-01",
            "timestamp": "2026-08-14T10:00:00Z",
            "temperature": 24.3,
            "humidity": 63.2,
            "soil_moisture": 58.1,
            "light": 720,
            # sensor no contemplado aún: se conserva en el payload
            "vpd": 1.1,
        },
    )
    assert response.status_code == 202
    assert response.json()["accepted"] is True


async def test_device_telemetry_validates_ranges(env: Env) -> None:
    response = await env.client.post(
        "/api/v1/device/telemetry",
        headers=DEVICE_HEADERS,
        json={"device_id": "esp32-01", "humidity": 150},
    )
    assert response.status_code == 422
