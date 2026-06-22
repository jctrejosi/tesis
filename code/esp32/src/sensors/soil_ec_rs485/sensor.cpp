#include "sensors/soil_ec_rs485/sensor.h"
#include "sensors/soil_ec_rs485/config_store.h"

#include <Arduino.h>

namespace soil_ec_rs485 {

    void Sensor::init() {
        config = storage::load_soil_ec_rs485_config();

        if (!validate_config(config)) {
            Serial.println("[SOIL_EC_RS485] config inválida en NVS, usando defaults");
            config = get_default_config();
            storage::save_soil_ec_rs485_config(config);
        }

        if (!driver.apply_config(config)) {
            Serial.println("[SOIL_EC_RS485] no se pudo aplicar config");
            config = get_default_config();
            driver.apply_config(config);
            storage::save_soil_ec_rs485_config(config);
        }

        config = driver.get_config();

        if (!driver.begin()) {
            Serial.println("[SOIL_EC_RS485] init failed");
        } else {
            Serial.println("[SOIL_EC_RS485] ready");
        }
    }

    SoilECData Sensor::read() {
        return driver.read();
    }

    bool Sensor::begin() {
        return driver.begin();
    }

    bool Sensor::apply_config(const Config& cfg) {
        if (!driver.apply_config(cfg)) {
            return false;
        }

        config = driver.get_config();

        if (!storage::save_soil_ec_rs485_config(config)) {
            Serial.println("[SOIL_EC_RS485] no se pudo guardar config");
            return false;
        }

        return true;
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    void Sensor::set_simulation(bool enabled) {
        Config cfg = driver.get_config();
        cfg.simulation = enabled;

        if (!driver.apply_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] no se pudo aplicar simulation");
            return;
        }

        config = driver.get_config();

        if (!storage::save_soil_ec_rs485_config(config)) {
            Serial.println("[SOIL_EC_RS485] no se pudo guardar simulation");
        }

        if (!enabled && !driver.is_ready()) {
            driver.begin();
        }
    }

    SoilECDriver& Sensor::get_driver() {
        return driver;
    }

}