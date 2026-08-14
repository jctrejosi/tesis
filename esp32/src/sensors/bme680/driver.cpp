#include "sensors/bme680/driver.h"

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME680.h>

#define BME680_I2C_ADDRESS 0x76
#define BME680_SDA_PIN 21
#define BME680_SCL_PIN 22

namespace bme680 {

    static Adafruit_BME680 bme;

    BME680Driver::BME680Driver()
        : simulation_mode(false),
        hardware_ready(false),
        current_config(get_default_config()) {}

    uint8_t BME680Driver::map_oversampling(uint8_t value) {
        switch (value) {
            case 0:  return BME680_OS_NONE;
            case 1:  return BME680_OS_1X;
            case 2:  return BME680_OS_2X;
            case 4:  return BME680_OS_4X;
            case 8:  return BME680_OS_8X;
            case 16: return BME680_OS_16X;
            default: return BME680_OS_8X;
        }
    }

    uint8_t BME680Driver::map_filter(uint8_t value) {
        switch (value) {
            case 0:   return BME680_FILTER_SIZE_0;
            case 1:   return BME680_FILTER_SIZE_1;
            case 3:   return BME680_FILTER_SIZE_3;
            case 7:   return BME680_FILTER_SIZE_7;
            case 15:  return BME680_FILTER_SIZE_15;
            case 31:  return BME680_FILTER_SIZE_31;
            case 63:  return BME680_FILTER_SIZE_63;
            case 127: return BME680_FILTER_SIZE_127;
            default:  return BME680_FILTER_SIZE_3;
        }
    }

    void BME680Driver::apply_hardware_config() {
        if (!hardware_ready || simulation_mode) {
            return;
        }

        bme.setTemperatureOversampling(map_oversampling(current_config.temp_oversample));
        bme.setHumidityOversampling(map_oversampling(current_config.hum_oversample));
        bme.setPressureOversampling(map_oversampling(current_config.press_oversample));
        bme.setIIRFilterSize(map_filter(current_config.iir_filter));
        bme.setGasHeater(current_config.gas_heater_temp, current_config.gas_heater_duration);
    }

    bool BME680Driver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            hardware_ready = false;
            Serial.println("BME680 en modo simulación (config)");
            return true;
        }

        // NO llamar a Wire.begin() - ya está inicializado globalmente

        if (!bme.begin(BME680_I2C_ADDRESS)) {
            Serial.println("Error: no se encontró BME680 en I2C, activando simulación");
            simulation_mode = true;
            current_config.simulation = true;
            hardware_ready = false;
            return true;
        }

        hardware_ready = true;
        apply_hardware_config();
        Serial.println("BME680 inicializado correctamente");
        return true;
    }

    void BME680Driver::set_simulation_mode(bool enabled) {
        if (enabled == simulation_mode) return;
        simulation_mode = enabled;
        current_config.simulation = enabled;

        if (enabled) {
            // Al entrar en simulación, marcamos hardware como no listo
            // pero NO tocamos Wire (el bus sigue activo para otros sensores)
            hardware_ready = false;
        } else {
            // Al salir de simulación, el bus I2C ya está inicializado globalmente
            if (bme.begin(BME680_I2C_ADDRESS)) {
                hardware_ready = true;
                apply_hardware_config();
            } else {
                Serial.println("[BME680] sensor no responde al salir de simulación");
                hardware_ready = false;
            }
        }
    }

    bool BME680Driver::apply_config(const Config& cfg) {
        if (!validate_config(cfg)) {
            Serial.println("Error: config BME680 inválida");
            return false;
        }

        current_config = cfg;
        simulation_mode = cfg.simulation;

        if (hardware_ready && !simulation_mode) {
            apply_hardware_config();
        }

        return true;
    }

    Config BME680Driver::get_config() const {
        return current_config;
    }

    BME680Data BME680Driver::read() {
        BME680Data data{};

        if (simulation_mode) {
            data.temperature = random(220, 320) / 10.0;
            data.humidity = random(400, 800) / 10.0;
            data.pressure = random(9900, 10300) / 10.0;
            data.gas_resistance = random(100, 500);
            return data;
        }

        if (!bme.performReading()) {
            Serial.println("Error: lectura BME680 falló");

            data.temperature = NAN;
            data.humidity = NAN;
            data.pressure = NAN;
            data.gas_resistance = NAN;
            return data;
        }

        data.temperature = bme.temperature;
        data.humidity = bme.humidity;
        data.pressure = bme.pressure / 100.0;
        data.gas_resistance = bme.gas_resistance;

        return data;
    }

}