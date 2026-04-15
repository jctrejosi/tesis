from pydantic import BaseModel, Field

class BME680Schema(BaseModel):
    temperature: float | None = None
    humidity: float | None = None
    pressure: float | None = None
    gas: float | None = None

class BME680ConfigSchema(BaseModel):
    interval_ms: int = Field(default=10000, ge=1000, le=3600000)
    simulation: bool = False

    temp_oversample: int = Field(default=8)
    hum_oversample: int = Field(default=2)
    press_oversample: int = Field(default=4)

    iir_filter: int = Field(default=3)

    gas_heater_temp: int = Field(default=320, ge=200, le=400)
    gas_heater_duration: int = Field(default=150, ge=0, le=300)