from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, Integer, JSON, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SetpointSnapshot(Base):
    """Instantánea versionada de los objetivos activos del cultivo.

    Registra el histórico de setpoints para poder reconstruir, en cualquier
    instante `t`, cuáles eran los objetivos vigentes (referencia `x*` del MPC).
    Se añade una fila cada vez que cambian los objetivos de la fase activa o la
    fase activa misma.
    """

    __tablename__ = "setpoint_snapshots"

    # BIGINT en Postgres; INTEGER en SQLite para que la PK autoincremente en tests.
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    crop_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    crop_name: Mapped[str | None] = mapped_column(String(120))
    phase_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    phase_name: Mapped[str | None] = mapped_column(String(80))

    # Hash de la versión de objetivos (mismo algoritmo que /device/targets).
    version: Mapped[str | None] = mapped_column(String(16))
    targets: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
