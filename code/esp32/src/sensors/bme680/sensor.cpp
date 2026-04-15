#include "sensors/bme680/sensor.h"
#include <Arduino.h>

namespace bme680 {

    void Sensor::init() {
        config = get_default_config();

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
        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    BME680Driver& Sensor::get_driver() {
        return driver;
    }

}