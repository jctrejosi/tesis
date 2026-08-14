from __future__ import annotations

import re
import unicodedata
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app import repositories
from app.core.config import Settings
from app.integrations.deepseek import DeepSeekClient
from app.models import CropPhase, Recommendation
from app.schemas import PhaseApplyResult, RecommendRequest, RecommendResult
from app.schemas.recommendation import RecommendationResponse
from app.services.crops import CropService


def _norm_name(name: str) -> str:
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", name.strip().lower())


class RecommendationService:
    """Flujo de recomendación: consulta DeepSeek, valida, guarda la respuesta
    original y aplica las fases propuestas sin pisar nunca una configuración
    que el usuario haya modificado manualmente."""

    def __init__(
        self,
        session: AsyncSession,
        client: DeepSeekClient,
        settings: Settings,
    ) -> None:
        self.session = session
        self.client = client
        self.settings = settings

    async def recommend(self, crop_id: uuid.UUID, request: RecommendRequest) -> RecommendResult:
        crop = await CropService(self.session).get(crop_id)

        validated: RecommendationResponse = await self.client.recommend(
            {
                "species": crop.species,
                "variety": crop.variety,
                "location": crop.location,
                "growing_system": crop.growing_system,
                "extra_context": request.extra_context or crop.notes,
            }
        )

        # 1. Auditoría: respuesta original validada, tal cual se recibió.
        recommendation = Recommendation(
            id=uuid.uuid4(),
            crop_id=crop.id,
            source="deepseek",
            model=self.settings.deepseek_model,
            payload=validated.model_dump(exclude_none=True),
        )
        self.session.add(recommendation)

        # 2. Aplicar fases: crear las nuevas, refrescar recomendación de las
        #    existentes y preservar cualquier configuración manual.
        existing_by_name = {_norm_name(p.name): p for p in crop.phases}
        was_new_crop = not crop.phases
        results: list[PhaseApplyResult] = []

        for index, phase_rec in enumerate(validated.phases):
            rec_targets = phase_rec.targets.model_dump(exclude_none=True)
            existing = existing_by_name.get(_norm_name(phase_rec.name))

            if existing is not None:
                untouched = (
                    existing.targets is None
                    or existing.targets == existing.recommended_targets
                )
                preserved = not untouched
                existing.recommended_targets = rec_targets
                if untouched:
                    existing.targets = rec_targets
                if existing.description is None:
                    existing.description = phase_rec.description
                results.append(
                    PhaseApplyResult(
                        phase_id=existing.id,
                        name=existing.name,
                        created=False,
                        recommendation_updated=True,
                        targets_preserved=preserved,
                    )
                )
                continue

            order = await repositories.next_phase_order(self.session, crop.id)
            phase = CropPhase(
                id=uuid.uuid4(),
                crop_id=crop.id,
                name=phase_rec.name,
                description=phase_rec.description,
                order=order,
                targets=rec_targets,
                recommended_targets=rec_targets,
            )
            # Cultivo nuevo (sin fases): la primera fase propuesta queda activa.
            if was_new_crop and index == 0:
                phase.is_active = True
                crop.active_phase_id = phase.id
            self.session.add(phase)
            results.append(
                PhaseApplyResult(
                    phase_id=phase.id,
                    name=phase.name,
                    created=True,
                    recommendation_updated=True,
                    targets_preserved=False,
                )
            )

        await self.session.commit()

        preserved_any = any(r.targets_preserved for r in results)
        return RecommendResult(
            recommendation_id=recommendation.id,
            model=self.settings.deepseek_model,
            summary=validated.summary,
            notes=validated.notes
            + (
                [
                    "Se preservaron las configuraciones modificadas manualmente: "
                    "la recomendación solo actualizó los valores de referencia."
                ]
                if preserved_any
                else []
            ),
            phases=results,
        )
