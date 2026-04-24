#include "sensors/bme680/sensor.h"
#include <Arduino.h>
#include "sensors/bme680/config_store.h"

namespace bme680 {

    void Sensor::init() {
        config = storage::load_bme680_config();
    
        if (!bme680::validate_config(config)) {
            Serial.println("[BME680] config inválida en almacenamiento, cargando defaults");
            config = bme680::get_default_config();
            storage::save_bme680_config(config);
        }
    
        if (!driver.apply_config(config)) {
            Serial.println("[BME680] no se pudo aplicar la configuración");
            return;
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