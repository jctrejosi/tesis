from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    JSON,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActuatorRegistry(Base):
    """Configuración semántica de cada canal de relé.

    El hardware solo conoce pines y `ON`/`OFF`; aquí vive **qué hay conectado**
    (`function`), su etiqueta y sus límites (`constraints`). Cada canal puede
    afectar a varias variables y esa relación la **aprende** el modelo (matriz
    `E`, ver `docs/especificacion.md` §4.4), no se declara.
    """

    __tablename__ = "actuator_registry"
    __table_args__ = (
        UniqueConstraint(
            "device_id", "channel", name="uq_actuator_registry_device_channel"
        ),
    )

    # BIGINT en Postgres; INTEGER en SQLite para que la PK autoincremente en tests.
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    device_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    channel: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    label: Mapped[str | None] = mapped_column(String(120))
    function: Mapped[str] = mapped_column(String(40), nullable=False, default="other")
    constraints: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class ActuatorConfigSnapshot(Base):
    """Configuración vigente de **todos** los canales en un instante `t`.

    Permite reconstruir qué hacía cada canal en el momento de una acción, igual
    que `SetpointSnapshot` lo hace con los objetivos: sin esto no se puede
    interpretar `(x_t, u_t, x_{t+1})` si un canal se reconfigura.
    """

    __tablename__ = "actuator_config_snapshots"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    device_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    version: Mapped[str | None] = mapped_column(String(16))
    config: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
