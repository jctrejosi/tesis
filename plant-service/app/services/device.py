from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app import repositories
from app.models import Crop, CropPhase, TelemetryEntry
from app.schemas import CurrentPhase, DeviceConfig, DeviceTargets, TelemetryIn
from app.schemas.targets import PhaseTargets, RANGE_KEYS


def _compact_range(target: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if target.min is not None:
        out["min"] = target.min
    if target.target is not None:
        out["target"] = target.target
    if target.max is not None:
        out["max"] = target.max
    if target.unit:
        out["unit"] = target.unit
    return out


def compact_targets(targets: PhaseTargets) -> dict[str, Any]:
    """Payload reducido para el microcontrolador: solo parámetros accionables
    (controllable y no informativos), sin metadatos de justificación."""
    out: dict[str, Any] = {}

    for key in RANGE_KEYS:
        target = getattr(targets, key)
        if (
            target is not None
            and target.controllable
            and not target.informational_only
        ):
            payload = _compact_range(target)
            if payload:
                out[key] = payload

    lighting = targets.lighting
    if (
        lighting is not None
        and lighting.controllable
        and not lighting.informational_only
    ):
        payload: dict[str, Any] = {"enabled": bool((lighting.hours_on or 0) > 0)}
        if lighting.hours_on is not None:
            payload["hours_on"] = lighting.hours_on
        if lighting.hours_off is not None:
            payload["hours_off"] = lighting.hours_off
        if lighting.intensity_target is not None:
            payload["intensity_target"] = lighting.intensity_target
        if lighting.unit:
            payload["unit"] = lighting.unit
        out["lighting"] = payload

    irrigation = targets.irrigation
    if (
        irrigation is not None
        and irrigation.controllable
        and not irrigation.informational_only
    ):
        payload: dict[str, Any] = {}
        if irrigation.threshold is not None:
            payload["threshold"] = irrigation.threshold
        if irrigation.duration_seconds is not None:
            payload["duration_seconds"] = irrigation.duration_seconds
        if irrigation.min_interval_hours is not None:
            payload["min_interval_hours"] = irrigation.min_interval_hours
        if irrigation.unit:
            payload["unit"] = irrigation.unit
        if payload:
            out["irrigation"] = payload

    for name, custom in targets.custom.items():
        if custom.controllable and not custom.informational_only:
            payload: dict[str, Any] = {}
            if custom.value is not None:
                payload["value"] = custom.value
            if custom.min is not None:
                payload["min"] = custom.min
            if custom.target is not None:
                payload["target"] = custom.target
            if custom.max is not None:
                payload["max"] = custom.max
            if custom.unit:
                payload["unit"] = custom.unit
            if payload:
                out.setdefault("custom", {})[name] = payload

    return out


def targets_version(phase_id: str, payload: dict[str, Any]) -> str:
    digest = hashlib.sha1(
        json.dumps({"phase": str(phase_id), "targets": payload}, sort_keys=True).encode()
    ).hexdigest()
    return digest[:16]


class DeviceService:
    """Fuente de configuración para el ESP: entrega los objetivos de la fase
    activa y recibe telemetría. Sin lógica de control (esa vive en el ESP)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _active(self) -> tuple[Crop, CropPhase] | None:
        phase = await repositories.get_active_phase(self.session)
        if phase is None:
            return None
        crop = await repositories.get_crop(self.session, phase.crop_id)
        if crop is None:
            return None
        return crop, phase

    async def current_phase(self) -> CurrentPhase:
        found = await self._active()
        if found is None:
            return CurrentPhase(phase=None, crop=None, active=False, updated_at=None)
        crop, phase = found
        return CurrentPhase(
            phase=phase.name,
            crop=crop.name,
            active=True,
            updated_at=phase.updated_at,
        )

    async def targets(self) -> DeviceTargets | None:
        found = await self._active()
        if found is None:
            return None
        crop, phase = found
        targets = (
            PhaseTargets.model_validate(phase.targets) if phase.targets else PhaseTargets()
        )
        payload = compact_targets(targets)
        return DeviceTargets(
            phase=phase.name,
            crop=crop.name,
            version=targets_version(phase.id, payload),
            updated_at=phase.updated_at,
            targets=payload,
        )

    async def config(self) -> DeviceConfig:
        targets = await self.targets()
        if targets is None:
            return DeviceConfig(
                current_phase=None,
                crop=None,
                version=None,
                updated_at=None,
                targets={},
            )
        return DeviceConfig(
            current_phase=targets.phase,
            crop=targets.crop,
            version=targets.version,
            updated_at=targets.updated_at,
            targets=targets.targets,
        )

    async def ingest(self, payload: TelemetryIn) -> TelemetryEntry:
        entry = TelemetryEntry(
            device_id=payload.device_id,
            ts=payload.timestamp or datetime.now(timezone.utc),
            # mode="json" serializa datetime a ISO para el almacenamiento JSON.
            payload=payload.model_dump(exclude_none=True, mode="json"),
        )
        await repositories.add_entry(self.session, entry)
        await self.session.commit()
        await self.session.refresh(entry)
        return entry
