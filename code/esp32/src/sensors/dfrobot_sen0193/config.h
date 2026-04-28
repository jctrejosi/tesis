#pragma once
#include <stdint.h>

namespace dfrobot_sen0193 {

    struct Config {

        // ===== general =====
        uint32_t interval_ms;
        bool simulation;

        // ===== hardware =====
        uint8_t adc_pin;

        // ===== calibración =====
        uint16_t dry_value;   // aire / suelo seco (ADC alto)
        uint16_t wet_value;   // agua / suelo húmedo (ADC bajo)

        // ===== filtrado =====
        uint8_t samples;      // cantidad de muestras para promedio
    };

    Config get_default_config();
    bool validate_config(const Config& cfg);

}