#include "sensors/bme680/sensor.h"
#include "sensors/bme680/config_store.h"
#include <Arduino.h>

namespace bme680 {

    void Sensor::begin() {
        Config cfg = storage::load_bme680_config();

        if (!validate_config(cfg)) {
            Serial.println("[BME680] config persistida inválida, usando default");
            cfg = get_default_config();
        }

        if (!driver.apply_config(cfg)) {
            Serial.println("[BME680] no se pudo aplicar config persistida");
        }

        if (!driver.begin()) {
            Serial.println("[BME680] init failed");
        } else {
            Serial.println("[BME680] ready");
        }
    }

    void Sensor::init() {
        begin(); // compatibilidad si el resto del código aún llama init()
    }

    BME680Data Sensor::read() {
        return driver.read();
    }

    bool Sensor::apply_config(const Config& cfg) {
        if (!driver.apply_config(cfg)) {
            return false;
        }

        if (!storage::save_bme680_config(cfg)) {
            Serial.println("[BME680] no se pudo guardar config en NVS");
            return false;
        }

        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    BME680Driver& Sensor::get_driver() {
        return driver;
    }

    const BME680Driver& Sensor::get_driver() const {
        return driver;
    }

}