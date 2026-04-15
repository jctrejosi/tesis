from fastapi import APIRouter, HTTPException

from schemas.scheduler import SchedulerConfigSchema
from services.scheduler_commands import (
    update_scheduler_config,
    trigger_global_sync
)

router = APIRouter()


@router.post("/scheduler/config")
def set_scheduler_config(config: SchedulerConfigSchema):
    ok = update_scheduler_config(
        config.model_dump()
    )

    if not ok:
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar scheduler"
        )

    return {
        "status": "scheduler_updated",
        "config": config
    }


@router.post("/scheduler/sync-now")
def sync_now():
    ok = trigger_global_sync()

    if not ok:
        raise HTTPException(
            status_code=500,
            detail="No se pudo ejecutar sync"
        )

    return {
        "status": "sync_triggered"
    }