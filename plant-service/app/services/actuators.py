from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app import repositories
from app.models import ActuatorConfigSnapshot, ActuatorRegistry
from app.repositories.actuators import DEFAULT_DEVICE_ID
from app.schemas.actuator import ActuatorConfig

# Convención de arranque (no obligatoria): la que usa también el simulador.
DEFAULT_CHANNELS: tuple[ActuatorConfig, ...] = (
    ActuatorConfig(channel=1, label="ventilación", function="ventilation"),
    ActuatorConfig(channel=2, label="iluminación", function="light"),
    ActuatorConfig(channel=3, label="riego", function="irrigation"),
    ActuatorConfig(channel=4, label="extracción", function="extraction"),
)


def config_payload(rows: list[ActuatorRegistry]) -> list[dict[str, Any]]:
    """Vista serializable y estable de la configuración (para hash y snapshot)."""
    return [
        {
            "channel": row.channel,
            "label": row.label,
            "function": row.function,
            "constraints": row.constraints or {},
            "enabled": row.enabled,
        }
        for row in sorted(rows, key=lambda r: r.channel)
    ]


def config_version(payload: list[dict[str, Any]]) -> str:
    digest = hashlib.sha1(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()
    return digest[:16]


async def record_config_snapshot(
    session: AsyncSession, device_id: int = DEFAULT_DEVICE_ID
) -> ActuatorConfigSnapshot | None:
    """Registra la configuración vigente si cambió (idempotente por hash)."""
    rows = await repositories.list_registry(session, device_id)
    if not rows:
        return None
    payload = config_payload(rows)
    version = config_version(payload)

    last = await repositories.latest_config_snapshot(session, device_id)
    if last is not None and last.version == version:
        return last

    snapshot = ActuatorConfigSnapshot(
        device_id=device_id,
        valid_from=datetime.now(timezone.utc),
        version=version,
        config=payload,
    )
    session.add(snapshot)
    await session.commit()
    await session.refresh(snapshot)
    return snapshot


async def upsert_registry(
    session: AsyncSession, config: ActuatorConfig, device_id: int = DEFAULT_DEVICE_ID
) -> ActuatorRegistry:
    """Crea o actualiza la configuración de un canal y registra la instantánea."""
    row = await repositories.get_registry(session, config.channel, device_id)
    if row is None:
        row = ActuatorRegistry(device_id=device_id, channel=config.channel)
        session.add(row)

    row.label = config.label
    row.function = config.function
    row.constraints = config.constraints.model_dump(exclude_none=True)
    row.enabled = config.enabled
    await session.commit()
    await session.refresh(row)

    await record_config_snapshot(session, device_id)
    return row


async def seed_default_registry(
    session: AsyncSession, device_id: int = DEFAULT_DEVICE_ID
) -> None:
    """Siembra la convención de arranque si el registro está vacío."""
    rows = await repositories.list_registry(session, device_id)
    if rows:
        return
    for config in DEFAULT_CHANNELS:
        session.add(
            ActuatorRegistry(
                device_id=device_id,
                channel=config.channel,
                label=config.label,
                function=config.function,
                constraints=config.constraints.model_dump(exclude_none=True),
                enabled=config.enabled,
            )
        )
    await session.commit()
    await record_config_snapshot(session, device_id)
