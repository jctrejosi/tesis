#include "sensors/bh1750/config.h"
#include <Arduino.h>

namespace bh1750 {

    Config get_default_config() {
        Config cfg;
        cfg.interval_ms = 10000;
        cfg.simulation = false;
        return cfg;
    }

    bool validate_config(const Config& cfg) {
        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 3600000) return false;
        return true;
    }

    void print_config(const Config& cfg) {
        Serial.println("---- BH1750 CONFIG ----");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.println("-----------------------");
    }

}