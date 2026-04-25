#include "sensors/bh1750/sensor.h"
#include "sensors/bh1750/config_store.h"

#include <Arduino.h>

namespace bh1750 {

    void Sensor::init() {
        Config cfg = storage::load_bh1750_config();

        if (!driver.apply_config(cfg)) {
            Serial.println("[BH1750] no se pudo aplicar config persistida");
        }

        if (!driver.begin()) {
            Serial.println("[BH1750] init failed");
        } else {
            Serial.println("[BH1750] ready");
        }
    }

    BH1750Data Sensor::read() {
        return driver.read();
    }

    void Sensor::set_simulation(bool enabled) {
        Config cfg = driver.get_config();
        cfg.simulation = enabled;
        driver.apply_config(cfg);
    }

    bool Sensor::apply_config(const Config& cfg) {
        return driver.apply_config(cfg);
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    BH1750Driver& Sensor::get_driver() {
        return driver;
    }

}