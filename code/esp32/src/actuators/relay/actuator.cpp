#include "actuators/relay/actuator.h"
#include "actuators/relay/config_store.h"

#include <Arduino.h>

namespace relay {

    void Sensor::init() {
        config = storage::load_relay_config();

        if (!driver.begin(config)) {
            Serial.println("[RELAY] init failed");
            return;
        }

        Serial.println("[RELAY] ready");
    }

    RelayConfig Sensor::get_config() const {
        return driver.get_config();
    }

    bool Sensor::apply_config(const RelayConfig& cfg) {
        if (!validate_config(cfg)) {
            Serial.println("[RELAY] config inválida");
            return false;
        }

        if (!driver.apply_config(cfg)) {
            Serial.println("[RELAY] driver reject config");
            return false;
        }

        config = cfg;
        storage::save_relay_config(cfg);

        return true;
    }

    void Sensor::set_channel(uint8_t channel, RelayState state) {
        driver.set_state(channel, state);
    }

    void Sensor::set_all(RelayState state) {
        driver.set_all(state);
    }

    RelayState Sensor::get_channel(uint8_t channel) const {
        return driver.get_state(channel);
    }

    RelayDriver& Sensor::get_driver() {
        return driver;
    }

}