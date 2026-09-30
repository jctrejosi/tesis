from __future__ import annotations

from fastapi import APIRouter

from app import repositories
from app.api.deps import SessionDep
from app.schemas.actuator import (
    ActuatorConfig,
    ActuatorConfigSnapshotRead,
    ActuatorRegistryRead,
)
from app.services.actuators import upsert_registry

router = APIRouter()


@router.get(
    "/registry",
    response_model=list[ActuatorRegistryRead],
    summary="Registro de actuadores (configuración por canal)",
)
async def get_registry(
    session: SessionDep, device_id: int = 1
) -> list[ActuatorRegistryRead]:
    rows = await repositories.list_registry(session, device_id)
    return [ActuatorRegistryRead.model_validate(r) for r in rows]


@router.get(
    "/registry/history",
    response_model=list[ActuatorConfigSnapshotRead],
    summary="Histórico de configuración de actuadores",
)
async def registry_history(
    session: SessionDep, device_id: int = 1, limit: int = 50
) -> list[ActuatorConfigSnapshotRead]:
    return await repositories.list_config_snapshots(session, device_id, limit)


@router.put(
    "/registry/{channel}",
    response_model=ActuatorRegistryRead,
    summary="Configurar un canal (función, etiqueta, límites, habilitado)",
)
async def put_registry(
    channel: int, payload: ActuatorConfig, session: SessionDep, device_id: int = 1
) -> ActuatorRegistryRead:
    config = payload.model_copy(update={"channel": channel})
    row = await upsert_registry(session, config, device_id)
    return ActuatorRegistryRead.model_validate(row)
