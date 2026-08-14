from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Crop, CropPhase


async def list_crops(session: AsyncSession) -> list[Crop]:
    result = await session.execute(
        select(Crop).options(selectinload(Crop.phases)).order_by(Crop.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_crop(session: AsyncSession, crop_id: uuid.UUID) -> Crop | None:
    result = await session.execute(
        select(Crop)
        .options(selectinload(Crop.phases))
        .where(Crop.id == crop_id)
    )
    return result.scalars().unique().one_or_none()


async def get_phase(
    session: AsyncSession, crop_id: uuid.UUID, phase_id: uuid.UUID
) -> CropPhase | None:
    result = await session.execute(
        select(CropPhase).where(
            CropPhase.id == phase_id, CropPhase.crop_id == crop_id
        )
    )
    return result.scalars().one_or_none()


async def get_active_phase(session: AsyncSession) -> CropPhase | None:
    result = await session.execute(
        select(CropPhase)
        .join(Crop, Crop.active_phase_id == CropPhase.id)
        .where(CropPhase.is_active.is_(True))
    )
    return result.scalars().first()


async def next_phase_order(session: AsyncSession, crop_id: uuid.UUID) -> int:
    result = await session.execute(
        select(CropPhase.order).where(CropPhase.crop_id == crop_id)
    )
    orders = list(result.scalars().all())
    return (max(orders) + 1) if orders else 0
