#include "sensors/bme680/command_handler.h"
#include "sensors/sensor_manager.h"
#include "sensors/bme680/config.h"

#include <ArduinoJson.h>
#include <Arduino.h>

namespace bme680 {

void handle_read_command() {
    sensors::publish_now();
}

void handle_config_command(const char* payload) {
    StaticJsonDocument<256> doc;

    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
        Serial.println("[BME680] config JSON inválido");
        return;
    }

    Config cfg;

    cfg.interval_ms = doc["interval_ms"] | 10000;
    cfg.simulation = doc["simulation"] | false;

    cfg.temp_oversample = doc["temp_oversample"] | 8;
    cfg.hum_oversample = doc["hum_oversample"] | 2;
    cfg.press_oversample = doc["press_oversample"] | 4;

    cfg.iir_filter = doc["iir_filter"] | 3;

    cfg.gas_heater_temp = doc["gas_heater_temp"] | 320;
    cfg.gas_heater_duration = doc["gas_heater_duration"] | 150;

    sensors::apply_bme680_config(cfg);

    Serial.println("[BME680] nueva configuración aplicada");
}

}