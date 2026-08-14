from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import repositories
from app.models import Crop, CropPhase
from app.schemas import CropCreate, CropDetail, CropRead, CropUpdate, PhaseCreate, PhaseRead, PhaseUpdate
from app.schemas.targets import PhaseTargets


def phase_to_read(phase: CropPhase) -> PhaseRead:
    targets = (
        PhaseTargets.model_validate(phase.targets) if phase.targets is not None else None
    )
    recommended = (
        PhaseTargets.model_validate(phase.recommended_targets)
        if phase.recommended_targets is not None
        else None
    )
    is_modified = bool(
        phase.targets is not None
        and phase.recommended_targets is not None
        and phase.targets != phase.recommended_targets
    )
    return PhaseRead(
        id=phase.id,
        name=phase.name,
        description=phase.description,
        order=phase.order,
        is_active=phase.is_active,
        targets=targets,
        recommended_targets=recommended,
        is_modified=is_modified,
        created_at=phase.created_at,
        updated_at=phase.updated_at,
    )


def crop_to_read(crop: Crop, detail: bool = False) -> CropRead | CropDetail:
    base = CropRead(
        id=crop.id,
        name=crop.name,
        species=crop.species,
        variety=crop.variety,
        location=crop.location,
        growing_system=crop.growing_system,
        notes=crop.notes,
        active_phase_id=crop.active_phase_id,
        created_at=crop.created_at,
        updated_at=crop.updated_at,
    )
    if not detail:
        return base
    return CropDetail(
        **base.model_dump(), phases=[phase_to_read(p) for p in crop.phases]
    )


def _deep_merge(base: dict, patch: dict) -> dict:
    """Fusión profunda: los sub-objetos (temperature, lighting, custom…)
    se combinan campo a campo en lugar de reemplazarse completos."""
    out = {**base}
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


class CropService:
    """CRUD de cultivos y fases + marcado de fase activa."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: CropCreate) -> Crop:
        crop = Crop(**data.model_dump())
        self.session.add(crop)
        await self.session.commit()
        await self.session.refresh(crop)
        return crop

    async def list(self) -> list[Crop]:
        return await repositories.list_crops(self.session)

    async def get(self, crop_id: uuid.UUID) -> Crop:
        crop = await repositories.get_crop(self.session, crop_id)
        if crop is None:
            raise HTTPException(status_code=404, detail="cultivo no encontrado")
        return crop

    async def update(self, crop_id: uuid.UUID, data: CropUpdate) -> Crop:
        crop = await self.get(crop_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(crop, field, value)
        await self.session.commit()
        await self.session.refresh(crop)
        return crop

    async def delete(self, crop_id: uuid.UUID) -> None:
        crop = await self.get(crop_id)
        await self.session.delete(crop)
        await self.session.commit()

    # ── Fases ─────────────────────────────────────────────────────────────

    async def add_phase(self, crop_id: uuid.UUID, data: PhaseCreate) -> CropPhase:
        crop = await self.get(crop_id)
        order = data.order if data.order is not None else await repositories.next_phase_order(
            self.session, crop_id
        )
        phase = CropPhase(
            id=uuid.uuid4(),
            crop_id=crop.id,
            name=data.name,
            description=data.description,
            order=order,
            targets=data.targets.model_dump(exclude_none=True) if data.targets else None,
        )
        # Si no hay fase activa, la primera fase creada queda activa.
        if crop.active_phase_id is None:
            phase.is_active = True
            crop.active_phase_id = phase.id
        self.session.add(phase)
        await self.session.commit()
        await self.session.refresh(phase)
        return phase

    async def update_phase(
        self, crop_id: uuid.UUID, phase_id: uuid.UUID, data: PhaseUpdate
    ) -> CropPhase:
        await self.get(crop_id)
        phase = await repositories.get_phase(self.session, crop_id, phase_id)
        if phase is None:
            raise HTTPException(status_code=404, detail="fase no encontrada")

        payload = data.model_dump(exclude_unset=True)
        if "targets" in payload:
            new_targets = payload.pop("targets")
            if new_targets is None:
                phase.targets = None
            else:
                # Merge profundo sobre la configuración existente. `new_targets`
                # ya es un dict con solo los campos enviados por el cliente.
                current = (
                    PhaseTargets.model_validate(phase.targets)
                    if phase.targets
                    else PhaseTargets()
                )
                merged = _deep_merge(
                    current.model_dump(exclude_none=True), new_targets
                )
                phase.targets = PhaseTargets.model_validate(merged).model_dump(
                    exclude_none=True
                )
        for field, value in payload.items():
            setattr(phase, field, value)

        await self.session.commit()
        await self.session.refresh(phase)
        return phase

    async def delete_phase(self, crop_id: uuid.UUID, phase_id: uuid.UUID) -> None:
        crop = await self.get(crop_id)
        phase = await repositories.get_phase(self.session, crop_id, phase_id)
        if phase is None:
            raise HTTPException(status_code=404, detail="fase no encontrada")
        was_active = phase.is_active
        await self.session.delete(phase)
        await self.session.flush()
        if was_active and crop.active_phase_id == phase_id:
            crop.active_phase_id = None
        await self.session.commit()

    async def activate_phase(self, crop_id: uuid.UUID, phase_id: uuid.UUID) -> Crop:
        crop = await self.get(crop_id)
        phase = await repositories.get_phase(self.session, crop_id, phase_id)
        if phase is None:
            raise HTTPException(status_code=404, detail="fase no encontrada")
        for p in crop.phases:
            p.is_active = p.id == phase.id
        crop.active_phase_id = phase.id
        await self.session.commit()
        await self.session.refresh(crop)
        return crop
