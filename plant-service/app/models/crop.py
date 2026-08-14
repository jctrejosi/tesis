from __future__ import annotations

import uuid

from sqlalchemy import String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Crop(Base, TimestampMixin):
    """Un cultivo configurado por el usuario (ej. tomate, lechuga…)."""

    __tablename__ = "crops"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    variety: Mapped[str | None] = mapped_column(String(120))
    location: Mapped[str | None] = mapped_column(Text)
    growing_system: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)

    active_phase_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)

    phases: Mapped[list[CropPhase]] = relationship(
        back_populates="crop",
        cascade="all, delete-orphan",
        order_by="CropPhase.order",
    )
