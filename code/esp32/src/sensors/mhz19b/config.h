#pragma once

#include <stdint.h>

namespace mhz19b {
    struct MHZ19BData {
        int co2_ppm;
    };

    struct Config {
        // sistema
        uint32_t interval_ms = 20000;
        bool simulation = false;

        // sensor
        bool auto_calibration = false; // ABC (Automatic Baseline Correction)
    };

    Config get_default_config();
    bool validate_config(const Config& cfg);
    void print_config(const Config& cfg);

}