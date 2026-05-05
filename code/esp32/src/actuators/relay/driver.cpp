#include "actuators/relay/driver.h"

#include <Arduino.h>

namespace relay {

    RelayDriver::RelayDriver() {
        pins[0] = 0;
        pins[1] = 0;
        pins[2] = 0;
        pins[3] = 0;
    }

    bool RelayDriver::begin(const RelayConfig& cfg) {

        config = cfg;

        pins[0] = cfg.pin_in1;
        pins[1] = cfg.pin_in2;
        pins[2] = cfg.pin_in3;
        pins[3] = cfg.pin_in4;

        for (int i = 0; i < 4; i++) {
            pinMode(pins[i], OUTPUT);
            write_pin(pins[i], false);
        }

        Serial.println("[RELAY] initialized");

        return true;
    }

    void RelayDriver::write_pin(uint8_t pin, bool state) {

        if (config.simulation) {
            Serial.print("[RELAY SIM] pin ");
            Serial.print(pin);
            Serial.print(" -> ");
            Serial.println(state ? "ON" : "OFF");
            return;
        }

        if (config.inverted) {
            state = !state;
        }

        digitalWrite(pin, state ? HIGH : LOW);
    }

    void RelayDriver::set_state(uint8_t channel, RelayState state) {

        if (channel < 1 || channel > 4) return;

        bool value = (state == RelayState::ON);

        write_pin(pins[channel - 1], value);
    }

    void RelayDriver::set_all(RelayState state) {

        bool value = (state == RelayState::ON);

        for (int i = 0; i < 4; i++) {
            write_pin(pins[i], value);
        }
    }

    RelayState RelayDriver::get_state(uint8_t channel) const {
        if (channel < 1 || channel > 4) return RelayState::OFF;

        int value = digitalRead(pins[channel - 1]);

        if (config.inverted) {
            value = !value;
        }

        return value ? RelayState::ON : RelayState::OFF;
    }

    RelayConfig RelayDriver::get_config() const {
        return config;
    }

    bool RelayDriver::apply_config(const RelayConfig& cfg) {

        if (cfg.pin_in1 == 0 ||
            cfg.pin_in2 == 0 ||
            cfg.pin_in3 == 0 ||
            cfg.pin_in4 == 0) {
            return false;
        }

        config = cfg;

        pins[0] = cfg.pin_in1;
        pins[1] = cfg.pin_in2;
        pins[2] = cfg.pin_in3;
        pins[3] = cfg.pin_in4;

        return true;
    }

}