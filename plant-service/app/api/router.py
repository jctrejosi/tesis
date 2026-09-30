from fastapi import APIRouter

from app.api.routes import actuators, crops, device, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(crops.router, prefix="/crops", tags=["crops"])
api_router.include_router(actuators.router, prefix="/actuators", tags=["actuators"])
api_router.include_router(device.router, prefix="/device", tags=["device"])
