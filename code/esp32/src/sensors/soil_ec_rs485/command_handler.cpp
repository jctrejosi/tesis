#include "sensors/soil_ec_rs485/command_handler.h"

#include "sensors/soil_ec_rs485/sensor.h"
#include "sensors/sensor_manager.h"

#include <ArduinoJson.h>
#include <Arduino.h>

namespace soil_ec_rs485 {

    // =========================================================
    // comando: read
    // =========================================================
    void handle_read_command() {
        sensors::publish_soil_ec_rs485_now();
    }

    // =========================================================
    // comando: config
    // =========================================================
    void handle_config_command(const char* payload) {

        StaticJsonDocument<256> doc;

        DeserializationError err = deserializeJson(doc, payload);

        if (err) {
            Serial.println("[SOIL_EC_RS485] JSON inválido");
            return;
        }

        Config cfg = get_default_config();

        // ===== parámetros base =====
        if (doc.containsKey("interval_ms"))
            cfg.interval_ms = doc["interval_ms"];

        if (doc.containsKey("simulation"))
            cfg.simulation = doc["simulation"];

        // ===== RS485 config =====
        if (doc.containsKey("baudrate"))
            cfg.baudrate = doc["baudrate"];

        // =====================================================
        // validación
        // =====================================================
        if (!validate_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] config inválida");
            return;
        }

        // =====================================================
        // aplicar vía sensor_manager (no directo al driver)
        // =====================================================
        if (!sensors::apply_soil_ec_rs485_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] no se pudo aplicar config");
            return;
        }

        Serial.println("[SOIL_EC_RS485] config aplicada correctamente");
    }

}