from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.recommendation import RecommendationResponse
from app.schemas.targets import PhaseTargets

logger = logging.getLogger("plant-service.deepseek")


class DeepSeekError(Exception):
    """Error base de la integración con DeepSeek."""


class DeepSeekUnavailableError(DeepSeekError):
    """No hay API key configurada o el servicio remoto falló."""


class DeepSeekValidationError(DeepSeekError):
    """La respuesta del modelo no cumple el schema esperado. Se rechaza."""


# ─── Prompt ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres un asesor técnico especializado en agricultura de ambiente \
controlado (CEA). Tu tarea es proponer parámetros ambientales objetivo para un \
cultivo específico, fase por fase.

Debes responder ÚNICAMENTE con un objeto JSON válido, sin markdown, sin \
comentarios y sin texto fuera del JSON. La estructura exacta es:

{
  "summary": "resumen breve en español",
  "notes": ["nota 1", "nota 2"],
  "phases": [
    {
      "name": "germinación",
      "description": "descripción breve de la fase",
      "targets": {
        "temperature":   {"min": 20.0, "target": 24.0, "max": 28.0, "unit": "°C", "controllable": true,  "informational_only": false, "reason": "..."},
        "humidity":      {"min": 55.0, "target": 65.0, "max": 75.0, "unit": "%HR", "controllable": true,  "informational_only": false, "reason": "..."},
        "soil_moisture": {"min": 40.0, "target": 60.0, "max": 75.0, "unit": "%", "controllable": true,  "informational_only": false, "reason": "..."},
        "lighting":      {"hours_on": 16, "hours_off": 8, "intensity_target": 500, "unit": "µmol/m²/s", "controllable": true, "informational_only": false, "reason": "..."},
        "ventilation":   {"min": 30.0, "target": 50.0, "max": 70.0, "unit": "%", "controllable": true, "informational_only": false, "reason": "..."},
        "extraction":    {"min": 20.0, "target": 30.0, "max": 60.0, "unit": "%", "controllable": true, "informational_only": false, "reason": "..."},
        "irrigation":    {"min_interval_hours": 8, "duration_seconds": 120, "threshold": 40, "unit": "%", "controllable": true, "informational_only": false, "reason": "..."},
        "co2":           {"min": 400.0, "target": 800.0, "max": 1200.0, "unit": "ppm", "controllable": false, "informational_only": true, "reason": "..."},
        "custom": {
          "nombre_del_parametro": {"value": 0, "unit": "", "controllable": false, "informational_only": true, "reason": "..."}
        }
      }
    }
  ]
}

Reglas estrictas:
1. Identifica las fases relevantes para el cultivo indicado (germinación, \
plántula, vegetativa, floración, fructificación, maduración u otras según \
corresponda). No asumas que todos los cultivos usan las mismas fases.
2. En cada rango debe cumplirse min <= target <= max.
3. Indica SIEMPRE la unidad de cada parámetro.
4. Explica brevemente en "reason" la justificación agronómica de cada valor.
5. "controllable": true solo para parámetros que el hardware puede controlar; \
los que no, deben llevar "informational_only": true.
6. No inventes sensores ni actuadores. El hardware actual controla: iluminación, \
ventilación, extracción y riego. Mide: temperatura, humedad relativa, humedad \
del sustrato y luminosidad. Parámetros como CO2, pH o conductividad son \
informativos (informational_only: true) salvo que se indique lo contrario.
7. Usa valores agronómicos reales y coherentes con fuentes confiables.
8. Si un parámetro no aplica para una fase, puedes omitirlo.
9. Nombres de claves JSON en inglés, valores de texto y razones en español."""


def build_user_prompt(
    *,
    species: str,
    variety: str | None,
    location: str | None,
    growing_system: str | None,
    extra_context: str | None,
) -> str:
    def or_none(value: str | None) -> str:
        return value.strip() if value and value.strip() else "no especificada"

    return (
        "Genera los parámetros ambientales para el siguiente cultivo:\n"
        f"- Especie/cultivo: {species}\n"
        f"- Variedad: {or_none(variety)}\n"
        f"- Ubicación/condiciones: {or_none(location)}\n"
        f"- Sistema de cultivo: {or_none(growing_system)}\n"
        f"- Notas adicionales: {or_none(extra_context)}\n"
    )


# ─── Normalización defensiva de la respuesta ──────────────────────────────

ALIAS_MAP = {
    "air_temperature": "temperature",
    "temp": "temperature",
    "temperatura": "temperature",
    "relative_humidity": "humidity",
    "air_humidity": "humidity",
    "rh": "humidity",
    "humedad_relativa": "humidity",
    "humedad": "humidity",
    "substrate_moisture": "soil_moisture",
    "soil_humidity": "soil_moisture",
    "moisture": "soil_moisture",
    "humedad_sustrato": "soil_moisture",
    "humedad_suelo": "soil_moisture",
    "light": "lighting",
    "lights": "lighting",
    "light_intensity": "lighting",
    "photoperiod": "lighting",
    "fotoperiodo": "lighting",
    "iluminacion": "lighting",
    "luz": "lighting",
    "ventilation_rate": "ventilation",
    "vent": "ventilation",
    "ventilacion": "ventilation",
    "extraction_rate": "extraction",
    "exhaust": "extraction",
    "extraccion": "extraction",
    "irrigation_interval": "irrigation",
    "watering": "irrigation",
    "riego": "irrigation",
    "co2_concentration": "co2",
    "dioxido_de_carbono": "co2",
    "substrate_temp": "substrate_temperature",
    "soil_temperature": "substrate_temperature",
    "conductivity": "ec",
    "conductividad_electrica": "ec",
    "ce": "ec",
    "ph_soil": "ph",
    "water_level_tank": "water_level",
    "nivel_agua": "water_level",
}

FIELD_ALIASES = {
    "minimum": "min",
    "minimo": "min",
    "maximum": "max",
    "maximo": "max",
    "optimal": "target",
    "objective": "target",
    "objetivo": "target",
    "ideal": "target",
    "light_hours": "hours_on",
    "horas_luz": "hours_on",
    "dark_hours": "hours_off",
    "horas_oscuridad": "hours_off",
    "intensity": "intensity_target",
    "intensidad": "intensity_target",
    "interval_hours": "min_interval_hours",
    "watering_duration": "duration_seconds",
    "duration": "duration_seconds",
    "duracion_segundos": "duration_seconds",
    "soil_moisture_threshold": "threshold",
    "umbral": "threshold",
}

KNOWN_TARGET_KEYS = {
    "temperature",
    "humidity",
    "soil_moisture",
    "lighting",
    "ventilation",
    "extraction",
    "irrigation",
    "co2",
    "substrate_temperature",
    "ec",
    "ph",
    "water_level",
    "custom",
}


def normalize_key(key: str) -> str:
    key = unicodedata.normalize("NFKD", key)
    key = "".join(c for c in key if not unicodedata.combining(c))
    key = key.strip().lower().replace("-", "_").replace(" ", "_")
    key = re.sub(r"_+", "_", key)
    return ALIAS_MAP.get(key, key)


def _coerce_fields(value: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in value.items():
        if not isinstance(k, str):
            continue
        nk = k.strip().lower().replace("-", "_").replace(" ", "_")
        out[FIELD_ALIASES.get(nk, nk)] = v
    return out


def normalize_phases(raw: dict[str, Any]) -> dict[str, Any]:
    """Aplica una normalización defensiva: renombra claves conocidas y mueve
    parámetros desconocidos a `custom` para no perder información. La
    validación estricta ocurre después con Pydantic."""
    phases = raw.get("phases")
    if not isinstance(phases, list):
        return raw

    normalized: list[dict[str, Any]] = []
    for phase in phases:
        if not isinstance(phase, dict):
            continue
        item: dict[str, Any] = {"name": phase.get("name"), "description": phase.get("description")}
        targets = phase.get("targets")
        if isinstance(targets, dict):
            norm_targets: dict[str, Any] = {}
            for key, value in targets.items():
                nk = normalize_key(str(key))
                if nk in KNOWN_TARGET_KEYS:
                    if nk == "custom" and not isinstance(norm_targets.get("custom"), dict):
                        norm_targets["custom"] = {}
                    if nk == "custom":
                        if isinstance(value, dict):
                            for ck, cv in value.items():
                                if isinstance(cv, dict):
                                    norm_targets["custom"][ck] = _coerce_fields(cv)
                    elif isinstance(value, dict):
                        norm_targets[nk] = _coerce_fields(value)
                    else:
                        norm_targets[nk] = value
                else:
                    # Parámetro no contemplado: se conserva como custom.
                    custom = norm_targets.setdefault("custom", {})
                    if isinstance(value, dict):
                        custom[key] = _coerce_fields(value)
                    else:
                        custom[key] = {"value": value}
            item["targets"] = norm_targets
        normalized.append(item)

    return {**raw, "phases": normalized}


def extract_json(content: str) -> dict[str, Any]:
    """Extrae el primer objeto JSON del contenido (tolera fences de markdown)."""
    text = content.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise DeepSeekValidationError(
                "la respuesta no contiene un objeto JSON válido"
            )
        data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise DeepSeekValidationError("la respuesta JSON no es un objeto")
    return data


# ─── Cliente ───────────────────────────────────────────────────────────────

class DeepSeekClient:
    """Cliente aislado para la API de DeepSeek. La API key vive únicamente
    en Settings (variables de entorno) y nunca se expone al navegador."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(
            base_url=settings.deepseek_base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
            timeout=settings.deepseek_timeout_seconds,
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def recommend(self, crop_input: dict[str, Any]) -> RecommendationResponse:
        settings = self._settings
        if not settings.deepseek_enabled:
            raise DeepSeekUnavailableError(
                "DEEPSEEK_API_KEY no está configurada en el entorno del servicio"
            )

        payload = {
            "model": settings.deepseek_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_user_prompt(**crop_input)},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            response = await self._http.post("/chat/completions", json=payload)
        except httpx.TimeoutException as exc:
            raise DeepSeekUnavailableError(
                f"timeout tras {settings.deepseek_timeout_seconds}s esperando a DeepSeek"
            ) from exc
        except httpx.HTTPError as exc:
            raise DeepSeekUnavailableError(f"error de red hacia DeepSeek: {exc}") from exc

        if response.status_code != 200:
            logger.error("DeepSeek respondió %s: %s", response.status_code, response.text[:500])
            raise DeepSeekUnavailableError(
                f"DeepSeek respondió con estado {response.status_code}"
            )

        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError) as exc:
            raise DeepSeekValidationError(
                "la respuesta de DeepSeek no tiene la estructura esperada"
            ) from exc

        data = extract_json(content)
        data = normalize_phases(data)

        try:
            validated = RecommendationResponse.model_validate(data)
        except ValidationError as exc:
            logger.error("Respuesta de DeepSeek inválida: %s", exc)
            raise DeepSeekValidationError(
                f"la respuesta de DeepSeek no cumple el schema: {exc.errors(include_url=False)[:3]}"
            ) from exc

        # Validación de coherencia de rangos (min <= target <= max).
        for phase in validated.phases:
            try:
                phase.targets.validate_all_ranges()
            except ValueError as exc:
                raise DeepSeekValidationError(
                    f"rango incoherente en la fase '{phase.name}': {exc}"
                ) from exc

        return validated
