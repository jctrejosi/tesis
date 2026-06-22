#include "sensors/as7341/sensor.h"
#include "sensors/as7341/config_store.h"
#include <Arduino.h>

namespace as7341 {

    Sensor::Sensor()
        : config(get_default_config()) {}

    void Sensor::init() {
        config = storage::load_as7341_config();

        if (!driver.apply_config(config)) {
            Serial.println("[AS7341] config inválida");
            config = get_default_config();

            if (!driver.apply_config(config)) {
                Serial.println("[AS7341] no se pudo aplicar config por defecto");
            }

            storage::save_as7341_config(config);
        }

        if (!driver.begin()) {
            Serial.println("[AS7341] init failed");
        } else {
            Serial.println("[AS7341] ready");
        }
    }

    AS7341Data Sensor::read() {
        return driver.read();
    }

    bool Sensor::apply_config(const Config& cfg) {
        if (!driver.apply_config(cfg)) {
            return false;
        }

        config = cfg;

        if (!storage::save_as7341_config(cfg)) {
            Serial.println("[AS7341] no se pudo guardar config en NVS");
            return false;
        }

        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    void Sensor::set_simulation(bool enabled) {
        config.simulation = enabled;
        driver.set_simulation_mode(enabled);
    }

    AS7341Driver& Sensor::get_driver() {
        return driver;
    }

    const AS7341Driver& Sensor::get_driver() const {
        return driver;
    }

}