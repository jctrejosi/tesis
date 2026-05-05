#pragma once

#include <Arduino.h>

namespace relay {

    enum class RelayState {
        OFF = 0,
        ON  = 1
    };

    struct RelayConfig {
        uint8_t pin_in1;
        uint8_t pin_in2;
        uint8_t pin_in3;
        uint8_t pin_in4;

        bool inverted;        // algunos módulos son active LOW
        bool simulation;
    };

    RelayConfig get_default_config();

    bool validate_config(const RelayConfig& cfg);

}