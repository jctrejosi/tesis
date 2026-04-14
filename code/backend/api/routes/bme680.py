from fastapi import APIRouter
from services.bme680 import get_bme680_data

router = APIRouter()

@router.get("/bme680")
def read_bme680():
    return get_bme680_data()