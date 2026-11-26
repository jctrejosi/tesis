"""Catálogos: plant-service delega en el servicio RAG compartido."""

from __future__ import annotations

from app.integrations.rag import RagServiceError, RagUnavailableError
from tests.conftest import Env


async def test_ingest_text_delegates_to_rag(env: Env) -> None:
    response = await env.client.post(
        "/api/v1/catalog/sources/text",
        json={"title": "Catálogo", "text": "Tomate: 24 °C"},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert body["chunk_count"] == 3

    method, title, text, _ = env.fake_rag.calls[-1]
    assert method == "ingest_text"
    assert title == "Catálogo"
    assert "Tomate" in text


async def test_ingest_file_delegates_to_rag(env: Env) -> None:
    response = await env.client.post(
        "/api/v1/catalog/sources",
        files={"file": ("catalogo.txt", b"Lechuga: 18 C", "text/plain")},
        data={"title": "Subido"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["filename"] == "catalogo.txt"
    assert env.fake_rag.calls[-1][0] == "ingest_file"


async def test_list_and_detail_proxy(env: Env) -> None:
    env.fake_rag.sources = [
        {"id": "abc", "title": "Catálogo", "status": "completed"}
    ]
    listed = await env.client.get("/api/v1/catalog/sources")
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == "abc"

    detail = await env.client.get(
        "/api/v1/catalog/sources/11111111-1111-1111-1111-111111111111"
    )
    assert detail.status_code == 200
    assert "source" in detail.json()


async def test_delete_proxy(env: Env) -> None:
    response = await env.client.delete(
        "/api/v1/catalog/sources/11111111-1111-1111-1111-111111111111"
    )
    assert response.status_code == 204
    assert env.fake_rag.calls[-1][0] == "delete_source"


async def test_search_proxy(env: Env) -> None:
    env.fake_rag.search_results = [
        {
            "chunk_id": "c1",
            "source_id": "s1",
            "document_title": "Catálogo",
            "chunk_index": 0,
            "content": "Temperatura del tomate",
            "similarity": 0.9,
        }
    ]
    response = await env.client.post(
        "/api/v1/catalog/search",
        json={"query": "tomate", "top_k": 3, "use_reranker": False},
    )
    assert response.status_code == 200, response.text
    assert response.json()["results"][0]["content"] == "Temperatura del tomate"
    assert env.fake_rag.calls[-1][0] == "search"


async def test_context_proxy(env: Env) -> None:
    response = await env.client.get(
        "/api/v1/catalog/context", params={"q": "tomate"}
    )
    assert response.status_code == 200
    assert response.json()["chunks_used"] == 2


async def test_rag_errors_are_mapped(env: Env) -> None:
    env.fake_rag.error = RagUnavailableError("sin servicio")
    response = await env.client.post(
        "/api/v1/catalog/sources/text", json={"title": "x", "text": "y"}
    )
    assert response.status_code == 503

    env.fake_rag.error = RagServiceError("respuesta 500")
    response = await env.client.post(
        "/api/v1/catalog/sources/text", json={"title": "x", "text": "y"}
    )
    assert response.status_code == 502


async def test_recommendation_uses_rag_context(env: Env) -> None:
    crop = await env.client.post(
        "/api/v1/crops",
        json={"name": "Tomate 1", "species": "tomate", "variety": "cherry"},
    )
    assert crop.status_code == 201
    crop_id = crop.json()["id"]

    response = await env.client.post(f"/api/v1/crops/{crop_id}/recommend", json={})
    assert response.status_code == 200, response.text

    sent = env.fake_deepseek.calls[-1]
    assert sent["knowledge_context"]
    assert "TOMATE" in sent["knowledge_context"]
    assert any("catálogo de plantas" in note for note in response.json()["notes"])
    assert any(call[0] == "build_context" for call in env.fake_rag.calls)
