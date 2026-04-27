#pragma once

#include <Arduino.h>
#include <stdint.h>

namespace ds18b20 {

    struct Config {
        uint32_t interval_ms;
        bool simulation;

        // resolución del sensor: 9–12 bits
        uint8_t resolution;

        // address ROM (64 bits)
        uint8_t address[8];

        // usar address específico o index 0
        bool use_address;
    };

    struct DS18B20Data {
        float temperature;
    };

    Config get_default_config();

    bool validate_config(const Config& cfg);

    void print_config(const Config& cfg);

}