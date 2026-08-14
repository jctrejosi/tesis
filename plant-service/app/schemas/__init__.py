from app.schemas.crop import (
    CropCreate,
    CropDetail,
    CropRead,
    CropUpdate,
    PhaseApplyResult,
    PhaseCreate,
    PhaseRead,
    PhaseUpdate,
    RecommendRequest,
    RecommendResult,
)
from app.schemas.device import (
    CurrentPhase,
    DeviceConfig,
    DeviceTargets,
    TelemetryIn,
)
from app.schemas.recommendation import (
    PhaseRecommendation,
    RecommendationResponse,
)
from app.schemas.targets import (
    CustomTarget,
    IrrigationTarget,
    PhaseTargets,
    RangeTarget,
    ScheduleTarget,
)

__all__ = [
    "CropCreate",
    "CropDetail",
    "CropRead",
    "CropUpdate",
    "CurrentPhase",
    "CustomTarget",
    "DeviceConfig",
    "DeviceTargets",
    "IrrigationTarget",
    "PhaseApplyResult",
    "PhaseCreate",
    "PhaseRead",
    "PhaseRecommendation",
    "PhaseTargets",
    "PhaseUpdate",
    "RangeTarget",
    "RecommendRequest",
    "RecommendResult",
    "RecommendationResponse",
    "ScheduleTarget",
    "TelemetryIn",
]
