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

        if (!doc["interval_ms"].isNull())                 cfg.interval_ms                = doc["interval_ms"];
        if (!doc["simulation"].isNull())                  cfg.simulation                 = doc["simulation"];
        if (!doc["uart_port"].isNull())                   cfg.uart_port                  = doc["uart_port"];
        if (!doc["baudrate"].isNull())                    cfg.baudrate                   = doc["baudrate"];
        if (!doc["rx_pin"].isNull())                      cfg.rx_pin                     = doc["rx_pin"];
        if (!doc["tx_pin"].isNull())                      cfg.tx_pin                     = doc["tx_pin"];
        if (!doc["de_pin"].isNull())                      cfg.de_pin                     = doc["de_pin"];
        if (!doc["re_pin"].isNull())                      cfg.re_pin                     = doc["re_pin"];
        if (!doc["use_temperature_compensation"].isNull()) cfg.use_temperature_compensation = doc["use_temperature_compensation"];
        if (!doc["retries"].isNull())                     cfg.retries                    = doc["retries"];
        if (!doc["response_timeout_ms"].isNull())          cfg.response_timeout_ms        = doc["response_timeout_ms"];
        if (!doc["modbus_slave_id"].isNull())              cfg.modbus_slave_id            = doc["modbus_slave_id"];
        if (!doc["modbus_function"].isNull())              cfg.modbus_function            = doc["modbus_function"];
        if (!doc["modbus_ec_register"].isNull())           cfg.modbus_ec_register         = doc["modbus_ec_register"];
        if (!doc["modbus_temp_register"].isNull())         cfg.modbus_temp_register       = doc["modbus_temp_register"];
        if (!doc["modbus_reg_count"].isNull())             cfg.modbus_reg_count           = doc["modbus_reg_count"];
        if (!doc["ec_scale_factor"].isNull())              cfg.ec_scale_factor            = doc["ec_scale_factor"];
        if (!doc["temp_scale_factor"].isNull())            cfg.temp_scale_factor          = doc["temp_scale_factor"];
        if (!doc["read_temperature"].isNull())             cfg.read_temperature           = doc["read_temperature"];

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