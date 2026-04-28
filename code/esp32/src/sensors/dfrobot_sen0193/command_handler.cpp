#include "command_handler.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "sensors/sensor_manager.h"
#include "sensors/dfrobot_sen0193/config.h"
#include "sensors/dfrobot_sen0193/sensor.h"
#include "sensors/dfrobot_sen0193/config_store.h"

namespace dfrobot_sen0193 {

    void handle_read_command() {
        sensors::publish_dfrobot_sen0193_now();
    }

    void handle_config_command(const char* payload) {

        StaticJsonDocument<256> doc;

        DeserializationError err = deserializeJson(doc, payload);

        if (err) {
            Serial.println("[SEN0193] JSON inválido");
            return;
        }

        Config cfg = get_default_config();

        // ===== general =====
        cfg.interval_ms = doc["interval_ms"] | cfg.interval_ms;
        cfg.simulation  = doc["simulation"]  | cfg.simulation;

        // ===== hardware =====
        cfg.adc_pin = doc["adc_pin"] | cfg.adc_pin;

        // ===== calibración =====
        if (doc.containsKey("dry_value")) {
            cfg.dry_value = doc["dry_value"];
        }

        if (doc.containsKey("wet_value")) {
            cfg.wet_value = doc["wet_value"];
        }

        // ===== filtrado =====
        cfg.samples = doc["samples"] | cfg.samples;

        // ===== validación =====
        if (!validate_config(cfg)) {
            Serial.println("[SEN0193] config inválida");
            return;
        }

        // ===== aplicación en sistema =====
        if (!sensors::apply_dfrobot_sen0193_config(cfg)) {
            Serial.println("[SEN0193] no se pudo aplicar config");
            return;
        }

        Serial.println("[SEN0193] config aplicada correctamente");
    }

}