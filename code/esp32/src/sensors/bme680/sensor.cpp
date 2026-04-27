#include "sensors/bme680/sensor.h"
#include <Arduino.h>
#include "sensors/bme680/config_store.h"

namespace bme680 {

    void Sensor::init() {
        Config cfg = storage::load_bme680_config();
    
        if (!driver.apply_config(cfg)) {
            Serial.println("[BME680] no se pudo aplicar config persistida");
        }
    
        if (!driver.begin()) {
            Serial.println("[BME680] init failed");
        } else {
            Serial.println("[BME680] ready");
        }
    }

    BME680Data Sensor::read() {
        return driver.read();
    }

    bool Sensor::apply_config(const Config& cfg) {
        return driver.apply_config(cfg);
    }

}