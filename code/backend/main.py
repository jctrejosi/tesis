from fastapi import FastAPI

from mqtt_client.client import start_mqtt

from api.routes.bme680 import router as bme680_router
from api.routes.scheduler import router as scheduler_router

app = FastAPI()


@app.on_event("startup")
def startup_event():
    start_mqtt()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "growbox-backend"
    }


app.include_router(
    bme680_router,
    prefix="/api"
)

app.include_router(
    scheduler_router,
    prefix="/api"
)