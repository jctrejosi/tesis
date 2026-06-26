#include "sensors/as7341/command_handler.h"

#include "sensors/as7341/config.h"
#include "sensors/sensor_manager.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace as7341 {

    void handle_read_command() {

        sensors::publish_as7341_now();
    }

    void handle_config_command(
        const char* payload
    ) {

        JsonDocument doc;

        DeserializationError error =
            deserializeJson(doc, payload);

        if (error) {

            Serial.println(
                "[AS7341] JSON inválido"
            );

            return;
        }

        Config cfg;

        cfg.interval_ms =
            doc["interval_ms"] | 10000;

        cfg.simulation =
            doc["simulation"] | false;

        cfg.atime =
            doc["atime"] | 29;

        cfg.astep =
            doc["astep"] | 599;

        cfg.gain =
            doc["gain"] | 128;

        cfg.led_enabled =
            doc["led_enabled"] | false;

        cfg.led_current_ma =
            doc["led_current_ma"] | 10;

        if (!validate_config(cfg)) {

            Serial.println(
                "[AS7341] config inválida"
            );

            return;
        }

        if (!sensors::apply_as7341_config(cfg)) {

            Serial.println(
                "[AS7341] no se pudo aplicar configuración"
            );

            return;
        }

        Serial.println(
            "[AS7341] configuración aplicada"
        );
    }

    void handle_read_config_command() {
        sensors::publish_as7341_config();
    }

}