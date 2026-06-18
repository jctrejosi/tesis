#pragma once

#include <Arduino.h>

namespace as7341 {

    struct Config {

        // Framework
        uint32_t interval_ms;
        bool simulation;

        // Sensor configuration
        uint16_t atime;
        uint16_t astep;
        uint16_t gain;

        // Illumination LED
        bool led_enabled;
        uint16_t led_current_ma;
    };

    Config get_default_config();

    bool validate_config(const Config& cfg);

    void print_config(const Config& cfg);

}