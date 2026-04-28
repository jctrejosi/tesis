#include "config.h"

#include <Arduino.h>

namespace dfrobot_sen0193 {

    Config get_default_config() {
        Config cfg;

        // ===== defaults generales =====
        cfg.interval_ms = 5000;
        cfg.simulation = false;

        // ===== hardware =====
        cfg.adc_pin = 35;

        // ===== calibración (valores típicos ESP32 + sensor capacitivo) =====
        cfg.dry_value = 3200;
        cfg.wet_value = 1400;

        // ===== filtrado =====
        cfg.samples = 10;

        return cfg;
    }

    bool validate_config(const Config& cfg) {

        // intervalo mínimo razonable
        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 3600000) return false;

        // ADC válido ESP32
        if (cfg.adc_pin > 39) return false;

        // calibración lógica (seco debe ser mayor que húmedo)
        if (cfg.dry_value <= cfg.wet_value) return false;

        // rango razonable ADC
        if (cfg.dry_value > 4095) return false;
        if (cfg.wet_value > 4095) return false;

        // samples para promedio
        if (cfg.samples == 0) return false;
        if (cfg.samples > 50) return false;

        return true;
    }

}