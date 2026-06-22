#include "sensors/ds18b20/sensor.h"

#include <Arduino.h>

namespace ds18b20 {

    void Sensor::init(const Config& cfg) {
        // aplicar config primero
        if (!driver.apply_config(cfg)) {
            Serial.println("[DS18B20] config inválida en init, usando defaults");

            Config def = get_default_config();
            driver.apply_config(def);
        }

        // inicializar hardware (o simulación)
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

        if (!driver.apply_config(cfg)) {
            Serial.println("[DS18B20] no se pudo aplicar simulation");
        }
    }

    DS18B20Driver& Sensor::get_driver() {
        return driver;
    }

}