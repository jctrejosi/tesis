#include "sensors/bme680/config.h"
#include <Arduino.h>

namespace bme680 {

    // defaults del sistema (centralizados aquí)
    static Config default_config() {
        Config cfg;

        // --- sistema ---
        cfg.interval_ms = 10000;
        cfg.simulation = false;

        // --- oversampling (balanceado recomendado Bosch) ---
        cfg.temp_oversample = 8;
        cfg.hum_oversample = 2;
        cfg.press_oversample = 4;

        // --- filtro IIR (suavizado medio) ---
        cfg.iir_filter = 3;

        // --- gas sensor (VOC) ---
        cfg.gas_heater_temp = 320;
        cfg.gas_heater_duration = 150;

        return cfg;
    }

    // opcional: acceso a defaults globales
    Config get_default_config() {
        return default_config();
    }

    // validación básica de rangos (evita basura desde MQTT)
    bool validate_config(const Config& cfg) {

        if (cfg.interval_ms < 1000) return false;          // mínimo 1s
        if (cfg.interval_ms > 3600000) return false;       // máximo 1h

        if (cfg.temp_oversample > 16) return false;
        if (cfg.hum_oversample > 16) return false;
        if (cfg.press_oversample > 16) return false;

        if (cfg.iir_filter > 127) return false;

        if (cfg.gas_heater_temp < 200 || cfg.gas_heater_temp > 400)
            return false;

        if (cfg.gas_heater_duration < 0 || cfg.gas_heater_duration > 300)
            return false;

        return true;
    }

    // helper opcional: debug print
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