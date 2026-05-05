#include "actuators/relay/config.h"

#include <Arduino.h>

namespace relay {

    RelayConfig get_default_config() {

        RelayConfig cfg;

        cfg.pin_in1 = 27;
        cfg.pin_in2 = 26;
        cfg.pin_in3 = 25;
        cfg.pin_in4 = 33;

        cfg.inverted = false;     // la mayoría de módulos son active LOW, pero lo dejamos configurable
        cfg.simulation = false;

        cfg.interval_ms = 0;      // no aplica realmente, pero mantiene compatibilidad estructural

        return cfg;
    }

    bool validate_config(const RelayConfig& cfg) {

        // pines válidos en ESP32 GPIO general
        if (cfg.pin_in1 > 39 || cfg.pin_in2 > 39 ||
            cfg.pin_in3 > 39 || cfg.pin_in4 > 39) {
            return false;
        }

        // evitar pines input-only mal usados para salida (seguridad básica)
        if (cfg.pin_in1 >= 34 || cfg.pin_in2 >= 34 ||
            cfg.pin_in3 >= 34 || cfg.pin_in4 >= 34) {
            return false;
        }

        return true;
    }

}