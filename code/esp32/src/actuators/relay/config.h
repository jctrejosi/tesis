#pragma once

#include <Arduino.h>
#include "actuators/relay/relay.h"

namespace relay {

    struct RelayConfig {
        uint8_t pin_in1;
        uint8_t pin_in2;
        uint8_t pin_in3;
        uint8_t pin_in4;

        bool inverted;
        bool simulation;
        uint32_t interval_ms;
    };

    RelayConfig get_default_config();
    bool validate_config(const RelayConfig& cfg);

}