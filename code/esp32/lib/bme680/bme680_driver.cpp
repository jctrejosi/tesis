#include "bme680_driver.h"
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME680.h>

#define BME680_I2C_ADDRESS 0x76
#define BME680_SDA_PIN 21
#define BME680_SCL_PIN 22

static Adafruit_BME680 bme;

BME680Driver::BME680Driver() {
    simulation_mode = false;
}

bool BME680Driver::begin() {
    randomSeed(millis());

    if (simulation_mode) {
        return true;
    }

    Wire.begin(BME680_SDA_PIN, BME680_SCL_PIN);

    if (!bme.begin(BME680_I2C_ADDRESS)) {
        Serial.println("Error: no se encontró BME680 en I2C");
        return false;
    }

    /*
      Configuración recomendada Bosch / Adafruit:
      equilibrio entre estabilidad, precisión y consumo
    */
    bme.setTemperatureOversampling(BME680_OS_8X);
    bme.setHumidityOversampling(BME680_OS_2X);
    bme.setPressureOversampling(BME680_OS_4X);
    bme.setIIRFilterSize(BME680_FILTER_SIZE_3);

    /*
      Heater necesario para lectura gas VOC
      320°C por 150 ms suele funcionar bien
    */
    bme.setGasHeater(320, 150);

    Serial.println("BME680 inicializado correctamente");
    return true;
}

void BME680Driver::set_simulation_mode(bool enabled) {
    simulation_mode = enabled;
}

BME680Data BME680Driver::read() {
    BME680Data data;

    if (simulation_mode) {
        data.temperature = random(220, 320) / 10.0;
        data.humidity = random(400, 800) / 10.0;
        data.pressure = random(9900, 10300) / 10.0;
        data.gas_resistance = random(100, 500);
        return data;
    }

    /*
      Ejecuta medición real
    */
    if (!bme.performReading()) {
        Serial.println("Error: lectura BME680 falló");

        data.temperature = NAN;
        data.humidity = NAN;
        data.pressure = NAN;
        data.gas_resistance = NAN;
        return data;
    }

    /*
      Conversión a unidades útiles:
      temperatura -> °C
      humedad -> %
      presión -> hPa
      gas -> ohms
    */
    data.temperature = bme.temperature;
    data.humidity = bme.humidity;
    data.pressure = bme.pressure / 100.0;
    data.gas_resistance = bme.gas_resistance;

    return data;
}