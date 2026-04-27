#include "sensors/ds18b20/config.h"
#include <Arduino.h>

namespace ds18b20 {

    Config get_default_config() {
        Config cfg;

        cfg.interval_ms = 10000;
        cfg.simulation = false;

        // robusto por defecto
        cfg.resolution = 12;

        // address vacío
        for (int i = 0; i < 8; i++) {
            cfg.address[i] = 0;
        }

        cfg.use_address = false;

        return cfg;
    }

    bool validate_config(const Config& cfg) {
        // intervalo
        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 3600000) return false;

        // resolución válida
        if (cfg.resolution < 9 || cfg.resolution > 12) return false;

        // si usa address, no puede ser todo ceros
        if (cfg.use_address) {
            bool all_zero = true;

            for (int i = 0; i < 8; i++) {
                if (cfg.address[i] != 0) {
                    all_zero = false;
                    break;
                }
            }

            if (all_zero) return false;
        }

        return true;
    }

    void print_config(const Config& cfg) {
        Serial.println("---- DS18B20 CONFIG ----");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.print("resolution: ");
        Serial.println(cfg.resolution);

        Serial.print("use_address: ");
        Serial.println(cfg.use_address);

        Serial.print("address: ");
        for (int i = 0; i < 8; i++) {
            if (cfg.address[i] < 16) Serial.print("0");
            Serial.print(cfg.address[i], HEX);
            if (i < 7) Serial.print(":");
        }
        Serial.println();

        Serial.println("------------------------");
    }

}