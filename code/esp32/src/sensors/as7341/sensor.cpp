#include "sensors/as7341/sensor.h"

#include "sensors/as7341/config_store.h"
#include <Arduino.h>

namespace as7341 {

    Sensor::Sensor()
        : config(get_default_config()) {}

    void Sensor::init() {
        config = storage::load_as7341_config();

        driver.set_simulation_mode(config.simulation);

        if (!driver.apply_config(config)) {
            Serial.println("[AS7341] config inválida");
            config = get_default_config();
            driver.set_simulation_mode(config.simulation);
            driver.apply_config(config);
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

    bool Sensor::set_config(const Config& cfg) {
        if (!driver.apply_config(cfg)) {
            return false;
        }

        config = cfg;
        storage::save_as7341_config(cfg);
        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    void Sensor::set_simulation(bool enabled) {
        driver.set_simulation_mode(enabled);
        config.simulation = enabled;
    }

    AS7341Driver& Sensor::get_driver() {
        return driver;
    }

}