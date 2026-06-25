#include "sensors/mhz19b/command_handler.h"

#include "sensors/sensor_manager.h"
#include "sensors/mhz19b/config.h"

#include <ArduinoJson.h>
#include <Arduino.h>

namespace mhz19b {

    void handle_read_command() {
        sensors::publish_mhz19b_now();
    }

    void handle_config_command(const char* payload) {
        StaticJsonDocument<256> doc;

        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.println("[MHZ19B] JSON inválido");
            return;
        }

        Config cfg = get_default_config();

        // campos básicos
        cfg.interval_ms      = doc["interval_ms"]      | cfg.interval_ms;
        cfg.simulation       = doc["simulation"]       | cfg.simulation;
        cfg.auto_calibration = doc["auto_calibration"] | cfg.auto_calibration;

        if (!validate_config(cfg)) {
            Serial.println("[MHZ19B] config inválida");
            return;
        }

        if (!sensors::apply_mhz19b_config(cfg)) {
            Serial.println("[MHZ19B] no se pudo aplicar config");
            return;
        }

        Serial.println("[MHZ19B] config aplicada");
    }

    void handle_read_config_command() {
        sensors::publish_mhz19b_config();
    }

}