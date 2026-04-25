#include "sensors/bh1750/command_handler.h"
#include "sensors/sensor_manager.h"
#include "sensors/bh1750/driver.h"

#include <ArduinoJson.h>
#include <Arduino.h>

namespace bh1750 {

    void handle_read_command() {
        sensors::publish_bh1750_now();
    }

    void handle_config_command(const char* payload) {
        StaticJsonDocument<128> doc;

        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.println("[BH1750] JSON inválido");
            return;
        }

        Config cfg;

        cfg.interval_ms = doc["interval_ms"] | 10000;
        cfg.simulation = doc["simulation"] | false;

        if (!validate_config(cfg)) {
            Serial.println("[BH1750] config inválida");
            return;
        }

        if (!sensors::apply_bh1750_config(cfg)) {
            Serial.println("[BH1750] no se pudo aplicar config");
            return;
        }

        Serial.println("[BH1750] config aplicada");
    }

}