from pydantic import BaseModel

class BME680Schema(BaseModel):
    temperature: float
    humidity: float
    pressure: float
    gas: float