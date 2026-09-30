from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app import repositories
from app.models import SetpointSnapshot
from app.schemas.targets import PhaseTargets
from app.services.device import compact_targets, targets_version


async def record_setpoint_snapshot(session: AsyncSession) -> SetpointSnapshot | None:
    """Registra una instantánea de los objetivos activos si cambiaron.

    Se llama tras cualquier mutación que pueda alterar los objetivos vigentes
    (editar fase, activar fase, recomendación…). Si no hay fase activa o nada
    cambió desde la última instantánea, no inserta nada.
    """
    phase = await repositories.get_active_phase(session)
    if phase is None:
        return None

    crop = await repositories.get_crop(session, phase.crop_id)
    targets = (
        PhaseTargets.model_validate(phase.targets) if phase.targets else PhaseTargets()
    )
    payload = compact_targets(targets)
    version = targets_version(phase.id, payload)

    last = await repositories.latest_setpoint(session)
    if last is not None and last.phase_id == phase.id and last.version == version:
        return last

    snapshot = SetpointSnapshot(
        valid_from=datetime.now(timezone.utc),
        crop_id=crop.id if crop else phase.crop_id,
        crop_name=crop.name if crop else None,
        phase_id=phase.id,
        phase_name=phase.name,
        version=version,
        targets=payload,
    )
    session.add(snapshot)
    await session.commit()
    await session.refresh(snapshot)
    return snapshot
