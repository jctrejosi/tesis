#include "sensors/bme680/config.h"
#include <Arduino.h>

namespace bme680 {

    Config get_default_config() {
        return Config{};
    }

    static bool is_valid_oversample(uint8_t value) {
        return value == 0 || value == 1 || value == 2 || value == 4 || value == 8 || value == 16;
    }

    static bool is_valid_filter(uint8_t value) {
        return value == 0 || value == 1 || value == 3 || value == 7 ||
            value == 15 || value == 31 || value == 63 || value == 127;
    }

    bool validate_config(const Config& cfg) {
        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 3600000) return false;

        if (!is_valid_oversample(cfg.temp_oversample)) return false;
        if (!is_valid_oversample(cfg.hum_oversample)) return false;
        if (!is_valid_oversample(cfg.press_oversample)) return false;

        if (!is_valid_filter(cfg.iir_filter)) return false;

        if (cfg.gas_heater_temp < 200 || cfg.gas_heater_temp > 400) return false;
        if (cfg.gas_heater_duration > 300) return false;

        return true;
    }

    void print_config(const Config& cfg) {
        Serial.println("---- BME680 CONFIG ----");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.print("temp_oversample: ");
        Serial.println(cfg.temp_oversample);

        Serial.print("hum_oversample: ");
        Serial.println(cfg.hum_oversample);

        Serial.print("press_oversample: ");
        Serial.println(cfg.press_oversample);

        Serial.print("iir_filter: ");
        Serial.println(cfg.iir_filter);

        Serial.print("gas_heater_temp: ");
        Serial.println(cfg.gas_heater_temp);

        Serial.print("gas_heater_duration: ");
        Serial.println(cfg.gas_heater_duration);

        Serial.println("------------------------");
    }

}