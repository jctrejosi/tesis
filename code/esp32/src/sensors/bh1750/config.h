#pragma once

#include <Arduino.h>
#include <stdint.h>

namespace bh1750 {

    struct Config {
        uint32_t interval_ms;
        bool simulation;
    };

    struct BH1750Data {
        float illuminance;
    };

    Config get_default_config();
    bool validate_config(const Config& cfg);
    void print_config(const Config& cfg);

}