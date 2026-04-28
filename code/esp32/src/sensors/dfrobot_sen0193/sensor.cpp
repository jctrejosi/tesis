#include "sensors/dfrobot_sen0193/sensor.h"
#include "sensors/dfrobot_sen0193/config_store.h"

#include <Arduino.h>

namespace dfrobot_sen0193 {

    void Sensor::init() {

        Config cfg = storage::load_dfrobot_sen0193_config();

        if (!driver.apply_config(cfg)) {
            Serial.println("[SEN0193] no se pudo aplicar config persistida");
        }

        if (!driver.begin()) {
            Serial.println("[SEN0193] init failed");
        } else {
            Serial.println("[SEN0193] ready");
        }
    }

    SoilMoistureData Sensor::read() {
        return driver.read();
    }

    bool Sensor::apply_config(const Config& cfg) {
        return driver.apply_config(cfg);
    }

    Config Sensor::get_config() const {
        return driver.get_config();
    }

    DFRobotSEN0193Driver& Sensor::get_driver() {
        return driver;
    }

}