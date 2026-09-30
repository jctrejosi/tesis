from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SetpointSnapshotRead(BaseModel):
    """Instantánea de los objetivos activos (histórico de setpoints)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    valid_from: datetime
    crop_id: uuid.UUID | None = None
    crop_name: str | None = None
    phase_id: uuid.UUID | None = None
    phase_name: str | None = None
    version: str | None = None
    targets: dict[str, Any] = {}
    created_at: datetime
