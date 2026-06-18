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
        if (cfg.pin_in1 > 39 || cfg.pin_in2 > 39 ||
            cfg.pin_in3 > 39 || cfg.pin_in4 > 39) {
            return false;
        }

        if (cfg.pin_in1 >= 34 || cfg.pin_in2 >= 34 ||
            cfg.pin_in3 >= 34 || cfg.pin_in4 >= 34) {
            return false;
        }

        if (!pins_are_unique(cfg)) {
            return false;
        }

        return true;
    }

}