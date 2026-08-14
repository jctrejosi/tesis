#include "actuators/relay/config.h"

#include <Arduino.h>

namespace relay {

    RelayConfig get_default_config() {
        RelayConfig cfg;

        cfg.pin_in1 = 27;
        cfg.pin_in2 = 26;
        cfg.pin_in3 = 25;
        cfg.pin_in4 = 33;

        cfg.inverted = false;
        cfg.simulation = false;
        cfg.interval_ms = 0;
        cfg.publish_interval_ms = 0;

        return cfg;
    }

    static bool pins_are_unique(const RelayConfig& cfg) {
        return cfg.pin_in1 != cfg.pin_in2 &&
               cfg.pin_in1 != cfg.pin_in3 &&
               cfg.pin_in1 != cfg.pin_in4 &&
               cfg.pin_in2 != cfg.pin_in3 &&
               cfg.pin_in2 != cfg.pin_in4 &&
               cfg.pin_in3 != cfg.pin_in4;
    }

    bool validate_config(const RelayConfig& cfg) {
        // Los pines 34-39 son solo entrada en ESP32, no válidos para salida
        auto is_valid_output_pin = [](uint8_t pin) {
            return pin <= 33;
        };

        if (!is_valid_output_pin(cfg.pin_in1) ||
            !is_valid_output_pin(cfg.pin_in2) ||
            !is_valid_output_pin(cfg.pin_in3) ||
            !is_valid_output_pin(cfg.pin_in4)) {
            return false;
        }

        if (!pins_are_unique(cfg)) {
            return false;
        }

        return true;
    }

}