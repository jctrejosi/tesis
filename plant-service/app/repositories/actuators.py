from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActuatorConfigSnapshot, ActuatorRegistry

DEFAULT_DEVICE_ID = 1


async def list_registry(
    session: AsyncSession, device_id: int = DEFAULT_DEVICE_ID
) -> list[ActuatorRegistry]:
    result = await session.execute(
        select(ActuatorRegistry)
        .where(ActuatorRegistry.device_id == device_id)
        .order_by(ActuatorRegistry.channel)
    )
    return list(result.scalars().all())


async def get_registry(
    session: AsyncSession, channel: int, device_id: int = DEFAULT_DEVICE_ID
) -> ActuatorRegistry | None:
    result = await session.execute(
        select(ActuatorRegistry).where(
            ActuatorRegistry.device_id == device_id,
            ActuatorRegistry.channel == channel,
        )
    )
    return result.scalars().one_or_none()


async def latest_config_snapshot(
    session: AsyncSession, device_id: int = DEFAULT_DEVICE_ID
) -> ActuatorConfigSnapshot | None:
    result = await session.execute(
        select(ActuatorConfigSnapshot)
        .where(ActuatorConfigSnapshot.device_id == device_id)
        .order_by(ActuatorConfigSnapshot.valid_from.desc())
        .limit(1)
    )
    return result.scalars().first()


async def list_config_snapshots(
    session: AsyncSession, device_id: int = DEFAULT_DEVICE_ID, limit: int = 50
) -> list[ActuatorConfigSnapshot]:
    result = await session.execute(
        select(ActuatorConfigSnapshot)
        .where(ActuatorConfigSnapshot.device_id == device_id)
        .order_by(ActuatorConfigSnapshot.valid_from.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
