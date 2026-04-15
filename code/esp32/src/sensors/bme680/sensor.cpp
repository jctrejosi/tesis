#include "sensors/bme680/sensor.h"
#include <Arduino.h>
#include "sensors/bme680/config_store.h"

namespace bme680 {

    void Sensor::init() {
        config = storage::load_bme680_config();

        driver.set_simulation_mode(config.simulation);
        driver.apply_config(config);

        if (!driver.begin()) {
            Serial.println("[BME680] init failed");
        } else {
            Serial.println("[BME680] ready");
        }
    }

    BME680Data Sensor::read() {
        return driver.read();
    }

    bool Sensor::set_config(const Config& cfg) {
        if (!driver.apply_config(cfg)) {
            return false;
        }

        config = cfg;
        storage::save_bme680_config(cfg);

        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    BME680Driver& Sensor::get_driver() {
        return driver;
    }

}