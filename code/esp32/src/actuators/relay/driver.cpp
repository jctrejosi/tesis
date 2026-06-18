#include "actuators/relay/driver.h"

#include <Arduino.h>

namespace relay {

    RelayDriver::RelayDriver()
        : ready(false) {

        pins[0] = 0;
        pins[1] = 0;
        pins[2] = 0;
        pins[3] = 0;

        states[0] = RelayState::OFF;
        states[1] = RelayState::OFF;
        states[2] = RelayState::OFF;
        states[3] = RelayState::OFF;
    }

    void RelayDriver::write_pin_with_config(const RelayConfig& cfg, uint8_t pin, bool state) {
        if (cfg.simulation) {
            Serial.print("[RELAY SIM] pin ");
            Serial.print(pin);
            Serial.print(" -> ");
            Serial.println(state ? "ON" : "OFF");
            return;
        }

        if (cfg.inverted) {
            state = !state;
        }

        digitalWrite(pin, state ? HIGH : LOW);
    }

    void RelayDriver::write_pin(uint8_t pin, bool state) {
        write_pin_with_config(config, pin, state);
    }

    bool RelayDriver::begin(const RelayConfig& cfg) {
        if (!apply_config(cfg)) {
            return false;
        }

        ready = true;

        for (int i = 0; i < 4; i++) {
            pinMode(pins[i], OUTPUT);
            states[i] = RelayState::OFF;
            write_pin(pins[i], false);
        }

        Serial.println("[RELAY] initialized");
        return true;
    }

    bool RelayDriver::apply_config(const RelayConfig& cfg) {
        if (!validate_config(cfg)) {
            return false;
        }

        RelayConfig old_cfg = config;
        uint8_t old_pins[4] = { pins[0], pins[1], pins[2], pins[3] };
        bool was_ready = ready;

        if (was_ready) {
            for (int i = 0; i < 4; i++) {
                write_pin_with_config(old_cfg, old_pins[i], false);
            }
        }

        config = cfg;

        pins[0] = cfg.pin_in1;
        pins[1] = cfg.pin_in2;
        pins[2] = cfg.pin_in3;
        pins[3] = cfg.pin_in4;

        if (was_ready) {
            for (int i = 0; i < 4; i++) {
                pinMode(pins[i], OUTPUT);
                states[i] = RelayState::OFF;
                write_pin(pins[i], false);
            }
        }

        return true;
    }

    void RelayDriver::set_state(uint8_t channel, RelayState state) {
        if (channel < 1 || channel > 4) return;

        states[channel - 1] = state;

        if (!ready) return;

        write_pin(pins[channel - 1], state == RelayState::ON);
    }

    void RelayDriver::set_all(RelayState state) {
        for (int i = 0; i < 4; i++) {
            states[i] = state;
        }

        if (!ready) return;

        bool value = (state == RelayState::ON);

        for (int i = 0; i < 4; i++) {
            write_pin(pins[i], value);
        }
    }

    RelayState RelayDriver::get_state(uint8_t channel) const {
        if (channel < 1 || channel > 4) return RelayState::OFF;
        return states[channel - 1];
    }

    RelayConfig RelayDriver::get_config() const {
        return config;
    }

}