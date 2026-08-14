from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TelemetryEntry


async def add_entry(session: AsyncSession, entry: TelemetryEntry) -> TelemetryEntry:
    session.add(entry)
    await session.flush()
    return entry
