#include "sensors/mhz19b/sensor.h"
#include "sensors/mhz19b/config_store.h"

#include <Arduino.h>

namespace mhz19b {

    void Sensor::init() {
        // 1. cargar config persistida
        Config cfg = storage::load_mhz19b_config();

        // 2. aplicar config
        if (!driver.apply_config(cfg)) {
            Serial.println("[MHZ19B] config inválida, usando defaults");

            cfg = get_default_config();
            driver.apply_config(cfg);

            storage::save_mhz19b_config(cfg);
        }

        // 3. inicializar hardware o simulación
        if (!driver.begin()) {
            Serial.println("[MHZ19B] init failed");
        } else {
            Serial.println("[MHZ19B] ready");
        }
    }

    MHZ19BData Sensor::read() {
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
            Serial.println("[MHZ19B] no se pudo aplicar simulation");
        }
    }

    MHZ19BDriver& Sensor::get_driver() {
        return driver;
    }

}