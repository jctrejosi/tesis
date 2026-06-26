#include "sensors/mhz19b/config.h"
#include <Arduino.h>

namespace mhz19b {

    Config get_default_config() {
        Config cfg;

        cfg.interval_ms = 20000; //20s
        cfg.simulation = false;
        cfg.auto_calibration = false; // robusto: evitar drift en indoor

        return cfg;
    }

    bool validate_config(const Config& cfg) {
        // intervalo
        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 3600000) return false;

        // nada más que validar aquí realmente
        return true;
    }

    void print_config(const Config& cfg) {
        Serial.println("---- MHZ19B CONFIG ----");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.print("auto_calibration: ");
        Serial.println(cfg.auto_calibration);

        Serial.println("------------------------");
    }

}