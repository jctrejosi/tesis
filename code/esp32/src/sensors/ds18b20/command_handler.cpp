#include "sensors/ds18b20/command_handler.h"

#include "sensors/sensor_manager.h"
#include "sensors/ds18b20/config.h"

#include <ArduinoJson.h>
#include <Arduino.h>
#include <ctype.h>
#include <string.h>

namespace ds18b20 {

    // convierte hex char a valor
    static int hex_value(char c) {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        return -1;
    }

    // parsea string hex a array de 8 bytes
    static bool parse_address(const char* str, uint8_t out[8]) {
        char clean[32];
        int idx = 0;

        // limpiar: quitar ':' '-' espacios
        for (size_t i = 0; str[i] != '\0' && idx < (int)sizeof(clean) - 1; i++) {
            if (isxdigit(str[i])) {
                clean[idx++] = str[i];
            }
        }
        clean[idx] = '\0';

        // deben ser 16 hex chars (8 bytes)
        if (idx != 16) return false;

        for (int i = 0; i < 8; i++) {
            int hi = hex_value(clean[i * 2]);
            int lo = hex_value(clean[i * 2 + 1]);

            if (hi < 0 || lo < 0) return false;

            out[i] = (hi << 4) | lo;
        }

        return true;
    }

    void handle_read_command() {
        sensors::publish_ds18b20_air_now();
    }

    void handle_config_command(const char* payload) {
        StaticJsonDocument<256> doc;

        DeserializationError error = deserializeJson(doc, payload);

        if (error) {
            Serial.println("[DS18B20] JSON inválido");
            return;
        }

        Config cfg = get_default_config();

        // campos básicos
        cfg.interval_ms = doc["interval_ms"] | cfg.interval_ms;
        cfg.simulation  = doc["simulation"]  | cfg.simulation;
        cfg.resolution  = doc["resolution"]  | cfg.resolution;
        cfg.use_address = doc["use_address"] | cfg.use_address;

        // address opcional
        if (doc.containsKey("address")) {
            const char* addr_str = doc["address"];

            if (!parse_address(addr_str, cfg.address)) {
                Serial.println("[DS18B20] address inválido");
                return;
            }

            cfg.use_address = true;
        }

        if (!validate_config(cfg)) {
            Serial.println("[DS18B20] config inválida");
            return;
        }

        if (!sensors::apply_ds18b20_air_config(cfg)) {
            Serial.println("[DS18B20] no se pudo aplicar config");
            return;
        }

        Serial.println("[DS18B20] config aplicada");
    }

}