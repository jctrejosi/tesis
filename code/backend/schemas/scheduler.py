from pydantic import BaseModel, Field


class SchedulerConfigSchema(BaseModel):
    global_sync_interval: int = Field(
        default=600000,
        ge=1000
    )