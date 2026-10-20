"""Cliente HTTP de los servicios de predicción de Astaroth (decisión D9).

`control-service` **no reimplementa** los modelos: los consume por URL.
- `XGBoost-api` (:8011)  → baseline por variable (lags + fecha + columnas).
- `transformerApi` (:8013) → iTransformer (forecast seq→seq; pasivo, sin acciones).
- `causalTransformer-api` (:8014) → world model condicionado a acciones (Fase 3).
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings


class AstarothError(RuntimeError):
    pass


class AstarothClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            timeout=settings.astaroth_timeout_s, follow_redirects=True
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, url: str, path: str) -> dict:
        response = await self._client.get(f"{url}{path}")
        if response.status_code >= 400:
            raise AstarothError(f"{path} → {response.status_code}: {response.text[:200]}")
        try:
            return response.json()
        except ValueError as exc:
            raise AstarothError(
                f"{path} → respuesta no-JSON ({response.status_code}): "
                f"{response.text[:200]}"
            ) from exc

    async def _post(self, url: str, path: str, payload: dict) -> dict:
        response = await self._client.post(f"{url}{path}", json=payload)
        if response.status_code >= 400:
            raise AstarothError(f"{path} → {response.status_code}: {response.text[:200]}")
        try:
            return response.json()
        except ValueError as exc:
            raise AstarothError(
                f"{path} → respuesta no-JSON ({response.status_code}): "
                f"{response.text[:200]}"
            ) from exc

    async def health(self) -> dict[str, Any]:
        services = {
            "xgboost": self._settings.astaroth_xgb_url,
            "transformer": self._settings.astaroth_transformer_url,
            "causal": self._settings.astaroth_causal_url,
        }
        out: dict[str, Any] = {}
        for name, url in services.items():
            try:
                out[name] = await self._get(url, "/health")
            except Exception as exc:  # noqa: BLE001 - reportar sin romper el health
                out[name] = {"status": "down", "detail": str(exc)}
        return out

    # ── XGBoost-api ────────────────────────────────────────────────────────

    async def xgb_train(
        self, model_name: str, target_column: str, data: list[dict]
    ) -> dict:
        return await self._post(
            self._settings.astaroth_xgb_url,
            "/train",
            {"model_name": model_name, "target_column": target_column, "data": data},
        )

    async def xgb_predict(self, model_name: str, points: int, data: list[dict]) -> dict:
        return await self._post(
            self._settings.astaroth_xgb_url,
            "/predict",
            {"model_name": model_name, "points": points, "data": data},
        )

    # ── transformerApi (iTransformer) ──────────────────────────────────────

    async def transformer_train(self, model_name: str, data: list[dict]) -> dict:
        return await self._post(
            self._settings.astaroth_transformer_url,
            "/train",
            {"model_name": model_name, "data": data},
        )

    async def transformer_predict(
        self, model_name: str, points: int, data: list[dict]
    ) -> dict:
        return await self._post(
            self._settings.astaroth_transformer_url,
            "/predict",
            {"model_name": model_name, "points": points, "data": data},
        )

    # ── causalTransformer-api (world model, Fase 3) ────────────────────────

    async def causal_predict(
        self,
        run_id: str,
        model_type: str,
        data: dict,
        n_steps: int = 1,
        submodel: str | None = None,
    ) -> dict:
        """Predice con un run entrenado. `data` sigue el contrato del upstream:
        `prev_outputs`, `prev_treatments`, `current_treatments`, `vitals`,
        `static_features` y `active_entries` (arrays con dimensión de lote).
        """
        payload: dict[str, Any] = {
            "run_id": run_id,
            "model_type": model_type,
            "data": data,
            "n_steps": n_steps,
        }
        if submodel:
            payload["submodel"] = submodel
        return await self._post(
            self._settings.astaroth_causal_url, "/predict/", payload
        )

    async def causal_scaling(self, run_id: str) -> dict:
        """Parámetros de normalización del run (medias/desv de entrada y salida)."""
        return await self._get(
            self._settings.astaroth_causal_url, f"/predict/scaling/{run_id}"
        )
