"""Tests de la integración con DeepSeek usando un transporte HTTP simulado."""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.config import Settings
from app.integrations.deepseek import (
    DeepSeekClient,
    DeepSeekUnavailableError,
    DeepSeekValidationError,
)


def _settings(**overrides) -> Settings:
    values = dict(
        deepseek_api_key="sk-test",
        deepseek_base_url="https://api.deepseek.com",
        deepseek_model="deepseek-chat",
        deepseek_timeout_seconds=5,
    )
    values.update(overrides)
    return Settings(**values)


def _client_with(handler, settings: Settings) -> DeepSeekClient:
    client = DeepSeekClient(settings)
    client._http = httpx.AsyncClient(
        base_url=settings.deepseek_base_url,
        headers={"Authorization": "Bearer sk-test"},
        timeout=5,
        transport=httpx.MockTransport(handler),
    )
    return client


def _chat_response(content: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": content}}]},
    )


async def test_recommend_parses_valid_json() -> None:
    payload = json.dumps(
        {
            "summary": "ok",
            "phases": [
                {
                    "name": "Vegetativa",
                    "targets": {
                        "temperature": {
                            "min": 20,
                            "target": 24,
                            "max": 28,
                            "unit": "°C",
                        }
                    },
                }
            ],
        }
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/chat/completions")
        body = json.loads(request.content)
        assert body["response_format"] == {"type": "json_object"}
        return _chat_response(payload)

    settings = _settings()
    client = _client_with(handler, settings)
    try:
        result = await client.recommend(
            {"species": "tomate", "variety": None, "location": None,
             "growing_system": None, "extra_context": None}
        )
    finally:
        await client.aclose()

    assert result.phases[0].name == "Vegetativa"
    assert result.phases[0].targets.temperature.target == 24


async def test_recommend_rejects_invalid_json_structure() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return _chat_response('{"esto": "no es una recomendación"}')

    client = _client_with(handler, _settings())
    try:
        with pytest.raises(DeepSeekValidationError):
            await client.recommend(
                {"species": "tomate", "variety": None, "location": None,
                 "growing_system": None, "extra_context": None}
            )
    finally:
        await client.aclose()


async def test_recommend_without_api_key() -> None:
    client = DeepSeekClient(_settings(deepseek_api_key=""))
    try:
        with pytest.raises(DeepSeekUnavailableError):
            await client.recommend(
                {"species": "tomate", "variety": None, "location": None,
                 "growing_system": None, "extra_context": None}
            )
    finally:
        await client.aclose()


async def test_recommend_propagates_http_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    client = _client_with(handler, _settings())
    try:
        with pytest.raises(DeepSeekUnavailableError):
            await client.recommend(
                {"species": "tomate", "variety": None, "location": None,
                 "growing_system": None, "extra_context": None}
            )
    finally:
        await client.aclose()


async def test_recommend_handles_timeout() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout")

    client = _client_with(handler, _settings())
    try:
        with pytest.raises(DeepSeekUnavailableError):
            await client.recommend(
                {"species": "tomate", "variety": None, "location": None,
                 "growing_system": None, "extra_context": None}
            )
    finally:
        await client.aclose()
