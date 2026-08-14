from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CropPhase(Base, TimestampMixin):
    """Una fase del cultivo (germinación, vegetativa, floración…).

    - `recommended_targets`: recomendación original (DeepSeek), solo lectura.
    - `targets`: configuración vigente, editable manualmente.
      Comparando ambos se detecta qué modificó el usuario.
    """

    __tablename__ = "crop_phases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    crop_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("crops.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    recommended_targets: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    targets: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    crop: Mapped[Crop] = relationship(back_populates="phases")
