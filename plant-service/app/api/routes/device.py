from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import SessionDep, require_device_key
from app.schemas import CurrentPhase, DeviceConfig, DeviceTargets, TelemetryIn
from app.services.device import DeviceService

router = APIRouter(dependencies=[Depends(require_device_key)])


@router.get("/config", response_model=DeviceConfig, summary="Configuración completa del dispositivo")
async def device_config(session: SessionDep) -> DeviceConfig:
    """Payload completo y compacto: fase activa + objetivos. Ideal para
    consultar al arrancar o cada N minutos."""
    return await DeviceService(session).config()


@router.get("/targets", response_model=DeviceTargets, summary="Objetivos actuales de la fase activa")
async def device_targets(session: SessionDep) -> DeviceTargets:
    return await DeviceService(session).targets()


@router.get("/current-phase", response_model=CurrentPhase, summary="Fase actualmente activa")
async def current_phase(session: SessionDep) -> CurrentPhase:
    return await DeviceService(session).current_phase()


@router.post("/telemetry", status_code=status.HTTP_202_ACCEPTED, summary="Recibir mediciones del dispositivo")
async def ingest_telemetry(payload: TelemetryIn, session: SessionDep) -> dict:
    entry = await DeviceService(session).ingest(payload)
    return {"accepted": True, "entry_id": entry.id, "device_id": payload.device_id}
