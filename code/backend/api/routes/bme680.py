from fastapi import APIRouter, HTTPException
from services.bme680 import get_bme680_data
from services.bme680_commands import request_bme680_read, update_bme680_config
from schemas.bme680 import BME680ConfigSchema

router = APIRouter()

@router.get("/bme680")
def read_bme680():
    return get_bme680_data()

@router.post("/bme680/read")
def read_bme680_now():
    ok = request_bme680_read()
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo enviar el comando de lectura")
    return {"status": "requested"}

@router.post("/bme680/config")
def set_bme680_config(config: BME680ConfigSchema):
    ok = update_bme680_config(config.model_dump())
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo enviar la configuración al ESP32")
    return {"status": "config_sent", "config": config}