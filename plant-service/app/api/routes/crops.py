from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import DeepSeekDep, SessionDep
from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.integrations.deepseek import (
    DeepSeekError,
    DeepSeekUnavailableError,
    DeepSeekValidationError,
)
from app.schemas import (
    CropCreate,
    CropDetail,
    CropRead,
    CropUpdate,
    PhaseCreate,
    PhaseRead,
    PhaseUpdate,
    RecommendRequest,
    RecommendResult,
)
from app.services.crops import CropService, crop_to_read, phase_to_read
from app.services.recommendations import RecommendationService

router = APIRouter()



@router.post("", response_model=CropRead, status_code=status.HTTP_201_CREATED, summary="Crear cultivo")
async def create_crop(payload: CropCreate, session: SessionDep) -> CropRead:
    crop = await CropService(session).create(payload)
    return crop_to_read(crop)


@router.get("", response_model=list[CropRead], summary="Listar cultivos")
async def list_crops(session: SessionDep) -> list[CropRead]:
    crops = await CropService(session).list()
    return [crop_to_read(c) for c in crops]


@router.get("/{crop_id}", response_model=CropDetail, summary="Detalle del cultivo (con fases)")
async def get_crop(crop_id: uuid.UUID, session: SessionDep) -> CropDetail:
    crop = await CropService(session).get(crop_id)
    return crop_to_read(crop, detail=True)


@router.patch("/{crop_id}", response_model=CropRead, summary="Modificar datos del cultivo")
async def update_crop(crop_id: uuid.UUID, payload: CropUpdate, session: SessionDep) -> CropRead:
    crop = await CropService(session).update(crop_id, payload)
    return crop_to_read(crop)


@router.delete("/{crop_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar cultivo")
async def delete_crop(crop_id: uuid.UUID, session: SessionDep) -> Response:
    await CropService(session).delete(crop_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Fases ─────────────────────────────────────────────────────────────────

@router.get("/{crop_id}/phases", response_model=list[PhaseRead], summary="Fases del cultivo")
async def list_phases(crop_id: uuid.UUID, session: SessionDep) -> list[PhaseRead]:
    crop = await CropService(session).get(crop_id)
    return [phase_to_read(p) for p in crop.phases]


@router.post(
    "/{crop_id}/phases",
    response_model=PhaseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear fase",
)
async def create_phase(crop_id: uuid.UUID, payload: PhaseCreate, session: SessionDep) -> PhaseRead:
    phase = await CropService(session).add_phase(crop_id, payload)
    return phase_to_read(phase)


@router.patch(
    "/{crop_id}/phases/{phase_id}",
    response_model=PhaseRead,
    summary="Modificar fase (nombre, orden o parámetros objetivo)",
)
async def update_phase(
    crop_id: uuid.UUID, phase_id: uuid.UUID, payload: PhaseUpdate, session: SessionDep
) -> PhaseRead:
    phase = await CropService(session).update_phase(crop_id, phase_id, payload)
    return phase_to_read(phase)


@router.delete(
    "/{crop_id}/phases/{phase_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar fase",
)
async def delete_phase(crop_id: uuid.UUID, phase_id: uuid.UUID, session: SessionDep) -> Response:
    await CropService(session).delete_phase(crop_id, phase_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{crop_id}/phases/{phase_id}/activate",
    response_model=CropDetail,
    summary="Marcar fase como activa (la que el ESP debe aplicar)",
)
async def activate_phase(crop_id: uuid.UUID, phase_id: uuid.UUID, session: SessionDep) -> CropDetail:
    crop = await CropService(session).activate_phase(crop_id, phase_id)
    return crop_to_read(crop, detail=True)


# ─── Recomendación DeepSeek ────────────────────────────────────────────────

@router.post(
    "/{crop_id}/recommend",
    response_model=RecommendResult,
    summary="Pedir a DeepSeek parámetros recomendados para el cultivo",
)
async def recommend(
    crop_id: uuid.UUID,
    session: SessionDep,
    client: DeepSeekDep,
    settings: Settings = Depends(get_settings),
    payload: RecommendRequest = RecommendRequest(),
) -> RecommendResult:
    service = RecommendationService(session, client, settings)
    try:
        return await service.recommend(crop_id, payload)
    except DeepSeekUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except DeepSeekValidationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except DeepSeekError as exc:
        raise HTTPException(status_code=502, detail=f"error de DeepSeek: {exc}") from exc
