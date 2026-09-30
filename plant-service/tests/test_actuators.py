"""Registro de actuadores: configuración por canal y snapshots."""

from __future__ import annotations

from tests.conftest import Env


async def test_put_and_get_registry(env: Env) -> None:
    r = await env.client.put(
        "/api/v1/actuators/registry/3",
        json={
            "channel": 3,
            "label": "riego",
            "function": "irrigation",
            "constraints": {"min_interval_s": 3600},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["channel"] == 3
    assert body["function"] == "irrigation"
    assert body["constraints"]["min_interval_s"] == 3600
    assert body["enabled"] is True

    r2 = await env.client.get("/api/v1/actuators/registry")
    assert r2.status_code == 200
    assert [row["channel"] for row in r2.json()] == [3]


async def test_invalid_function_is_rejected(env: Env) -> None:
    r = await env.client.put(
        "/api/v1/actuators/registry/1", json={"channel": 1, "function": "laser"}
    )
    assert r.status_code == 422


async def test_snapshot_only_on_change(env: Env) -> None:
    base = {"channel": 1, "function": "light"}
    await env.client.put("/api/v1/actuators/registry/1", json=base)
    await env.client.put("/api/v1/actuators/registry/1", json=base)  # sin cambios
    history = (await env.client.get("/api/v1/actuators/registry/history")).json()
    assert len(history) == 1
    assert history[0]["config"][0]["function"] == "light"

    await env.client.put(
        "/api/v1/actuators/registry/1", json={"channel": 1, "function": "heating"}
    )
    history2 = (await env.client.get("/api/v1/actuators/registry/history")).json()
    assert len(history2) == 2
    assert history2[0]["config"][0]["function"] == "heating"
