#include "sensors/soil_ec_rs485/command_handler.h"

#include "sensors/soil_ec_rs485/config_store.h"
#include "sensors/sensor_manager.h"

#include <ArduinoJson.h>
#include <Arduino.h>

namespace soil_ec_rs485 {

    void handle_read_command() {
        sensors::publish_soil_ec_rs485_now();
    }

    void handle_config_command(const char* payload) {
        JsonDocument doc;

        DeserializationError err = deserializeJson(doc, payload);
        if (err) {
            Serial.println("[SOIL_EC_RS485] JSON inválido");
            return;
        }

        Config cfg = storage::load_soil_ec_rs485_config();

        if (doc.containsKey("interval_ms")) {
            cfg.interval_ms = doc["interval_ms"];
        }

        if (doc.containsKey("simulation")) {
            cfg.simulation = doc["simulation"];
        }

        if (doc.containsKey("uart_port")) {
            cfg.uart_port = doc["uart_port"];
        }

        if (doc.containsKey("baudrate")) {
            cfg.baudrate = doc["baudrate"];
        }

        if (doc.containsKey("rx_pin")) {
            cfg.rx_pin = doc["rx_pin"];
        }

        if (doc.containsKey("tx_pin")) {
            cfg.tx_pin = doc["tx_pin"];
        }

        if (doc.containsKey("de_pin")) {
            cfg.de_pin = doc["de_pin"];
        }

        if (doc.containsKey("re_pin")) {
            cfg.re_pin = doc["re_pin"];
        }

        if (doc.containsKey("use_temperature_compensation")) {
            cfg.use_temperature_compensation = doc["use_temperature_compensation"];
        }

        if (doc.containsKey("retries")) {
            cfg.retries = doc["retries"];
        }

        if (doc.containsKey("response_timeout_ms")) {
            cfg.response_timeout_ms = doc["response_timeout_ms"];
        }

        if (doc.containsKey("modbus_slave_id"))       cfg.modbus_slave_id      = doc["modbus_slave_id"];
        if (doc.containsKey("modbus_function"))       cfg.modbus_function      = doc["modbus_function"];
        if (doc.containsKey("modbus_ec_register"))    cfg.modbus_ec_register   = doc["modbus_ec_register"];
        if (doc.containsKey("modbus_temp_register"))  cfg.modbus_temp_register = doc["modbus_temp_register"];
        if (doc.containsKey("modbus_reg_count"))      cfg.modbus_reg_count     = doc["modbus_reg_count"];
        if (doc.containsKey("ec_scale_factor"))       cfg.ec_scale_factor      = doc["ec_scale_factor"];
        if (doc.containsKey("temp_scale_factor"))     cfg.temp_scale_factor    = doc["temp_scale_factor"];
        if (doc.containsKey("read_temperature"))      cfg.read_temperature     = doc["read_temperature"];

        if (!validate_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] config inválida");
            return;
        }

        if (!sensors::apply_soil_ec_rs485_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] no se pudo aplicar config");
            return;
        }

        Serial.println("[SOIL_EC_RS485] config aplicada correctamente");
    }

    void handle_read_config_command() {
        sensors::publish_soil_ec_rs485_config();
    }

}