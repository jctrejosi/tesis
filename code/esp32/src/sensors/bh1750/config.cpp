#include "sensors/as7341/config.h"

#include <Arduino.h>

namespace as7341 {

    Config get_default_config() {

        Config cfg;

        // Framework
        cfg.interval_ms = 10000;
        cfg.simulation = false;

        // Sensor defaults
        cfg.atime = 29;
        cfg.astep = 599;

        cfg.gain = 128;

        // LED
        cfg.led_enabled = false;
        cfg.led_current_ma = 10;

        return cfg;
    }

    bool validate_config(const Config& cfg) {

        // Framework

        if (cfg.interval_ms < 1000) {
            return false;
        }

        if (cfg.interval_ms > 3600000) {
            return false;
        }

        // AS7341 integration settings

        if (cfg.atime > 255) {
            return false;
        }

        if (cfg.astep > 65534) {
            return false;
        }

        // Supported gain values

        switch (cfg.gain) {

            case 1:
            case 2:
            case 4:
            case 8:
            case 16:
            case 32:
            case 64:
            case 128:
            case 256:
            case 512:
                break;

            default:
                return false;
        }

        // LED current

        if (cfg.led_current_ma > 100) {
            return false;
        }

        return true;
    }

    void print_config(const Config& cfg) {

        Serial.println("------ AS7341 CONFIG ------");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.print("atime: ");
        Serial.println(cfg.atime);

        Serial.print("astep: ");
        Serial.println(cfg.astep);

        Serial.print("gain: ");
        Serial.println(cfg.gain);

        Serial.print("led_enabled: ");
        Serial.println(cfg.led_enabled);

        Serial.print("led_current_ma: ");
        Serial.println(cfg.led_current_ma);

        Serial.println("---------------------------");
    }

}