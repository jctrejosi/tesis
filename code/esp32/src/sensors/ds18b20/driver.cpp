#include "sensors/ds18b20/driver.h"

#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>

#define DS18B20_PIN 4

namespace ds18b20 {

    static OneWire oneWire(DS18B20_PIN);
    static DallasTemperature sensors(&oneWire);

    DS18B20Driver::DS18B20Driver()
        : simulation_mode(false),
          hardware_ready(false),
          current_config(get_default_config()) {}

    bool DS18B20Driver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            hardware_ready = false;
            return true;
        }

        sensors.begin();

        int device_count = sensors.getDeviceCount();

        if (device_count == 0) {
            Serial.println("[DS18B20] no detectado");
            hardware_ready = false;
            return false;
        }

        // aplicar resolución por defecto o config
        if (current_config.use_address) {
            sensors.setResolution(current_config.address, current_config.resolution);
        } else {
            sensors.setResolution(current_config.resolution);
        }

        hardware_ready = true;

        Serial.print("[DS18B20] detectados: ");
        Serial.println(device_count);

        return true;
    }

    void DS18B20Driver::set_simulation_mode(bool enabled) {
        simulation_mode = enabled;
        current_config.simulation = enabled;
    }

    bool DS18B20Driver::apply_config(const Config& cfg) {
        if (!validate_config(cfg)) {
            Serial.println("[DS18B20] config inválida");
            return false;
        }

        current_config = cfg;
        simulation_mode = cfg.simulation;

        // si ya está inicializado, aplicar resolución en caliente
        if (hardware_ready && !simulation_mode) {
            if (current_config.use_address) {
                sensors.setResolution(current_config.address, current_config.resolution);
            } else {
                sensors.setResolution(current_config.resolution);
            }
        }

        return true;
    }

    Config DS18B20Driver::get_config() const {
        return current_config;
    }

    DS18B20Data DS18B20Driver::read() {
        DS18B20Data data{};
        data.temperature = NAN;

        if (simulation_mode) {
            data.temperature = (float)random(180, 350) / 10.0; // 18.0 – 35.0
            return data;
        }

        if (!hardware_ready) {
            return data;
        }

        float temp;

        if (current_config.use_address) {
            sensors.requestTemperaturesByAddress(current_config.address);
            temp = sensors.getTempC(current_config.address);
        } else {
            sensors.requestTemperatures();
            temp = sensors.getTempCByIndex(0);
        }

        // validaciones reales del DS18B20
        if (temp == DEVICE_DISCONNECTED_C || temp < -55 || temp > 125) {
            Serial.println("[DS18B20] error lectura");
            return data;
        }

        data.temperature = temp;
        return data;
    }

    bool DS18B20Driver::is_ready() const {
        return hardware_ready;
    }

}