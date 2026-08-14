from fastapi import APIRouter

from app.api.routes import crops, device, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(crops.router, prefix="/crops", tags=["crops"])
api_router.include_router(device.router, prefix="/device", tags=["device"])
