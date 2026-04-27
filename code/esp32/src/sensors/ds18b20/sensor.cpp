#include "sensors/ds18b20/sensor.h"
#include "sensors/ds18b20/config_store.h"

#include <Arduino.h>

namespace ds18b20 {

    void Sensor::init() {
        Config cfg = storage::load_ds18b20_config();

        if (!driver.apply_config(cfg)) {
            Serial.println("[DS18B20] no se pudo aplicar config persistida");
        }

        if (!driver.begin()) {
            Serial.println("[DS18B20] init failed");
        } else {
            Serial.println("[DS18B20] ready");
        }
    }

    DS18B20Data Sensor::read() {
        return driver.read();
    }

    bool Sensor::apply_config(const Config& cfg) {
        return driver.apply_config(cfg);
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    void Sensor::set_simulation(bool enabled) {
        Config cfg = driver.get_config();
        cfg.simulation = enabled;
        driver.apply_config(cfg);
    }

    DS18B20Driver& Sensor::get_driver() {
        return driver;
    }

}