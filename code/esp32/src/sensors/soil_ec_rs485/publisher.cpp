#include "sensors/soil_ec_rs485/publisher.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>
#include "mqtt/client.h"

namespace soil_ec_rs485 {

    void Publisher::publish(const SoilECData& data) {
        if (isnan(data.ec_raw)) {
            Serial.println("[SOIL_EC_RS485] EC inválido");
            return;
        }

        StaticJsonDocument<256> doc;
        doc["device_id"] = 1;
        doc["timestamp"] = (const char*)nullptr;

        JsonObject metrics = doc.createNestedObject("metrics");
        metrics["ec"] = data.ec_raw;
        if (!isnan(data.temperature)) {
            metrics["temperature"] = data.temperature;
        } else {
            metrics["temperature"] = nullptr;
        }

        char buffer[256];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[SOIL_EC_RS485] error serializando JSON");
            return;
        }

        Serial.print("[SOIL_EC_RS485] publish: ");
        Serial.println(buffer);

        // Topic alineado con el alias en BD: soil_ec
        if (!publish_message("growbox/soil_ec/data", buffer)) {
            Serial.println("[SOIL_EC_RS485] error MQTT");
        }
    }

    void Publisher::publish_config(const Config& cfg) {
        StaticJsonDocument<384> doc;
        doc["interval_ms"]                = cfg.interval_ms;
        doc["simulation"]                 = cfg.simulation;
        doc["uart_port"]                  = cfg.uart_port;
        doc["baudrate"]                   = cfg.baudrate;
        doc["rx_pin"]                     = cfg.rx_pin;
        doc["tx_pin"]                     = cfg.tx_pin;
        doc["de_pin"]                     = cfg.de_pin;
        doc["re_pin"]                     = cfg.re_pin;
        doc["use_temperature_compensation"] = cfg.use_temperature_compensation;
        doc["retries"]                    = cfg.retries;
        doc["response_timeout_ms"]        = cfg.response_timeout_ms;

        // Campos Modbus
        doc["modbus_slave_id"]      = cfg.modbus_slave_id;
        doc["modbus_function"]      = cfg.modbus_function;
        doc["modbus_ec_register"]   = cfg.modbus_ec_register;
        doc["modbus_temp_register"] = cfg.modbus_temp_register;
        doc["modbus_reg_count"]     = cfg.modbus_reg_count;
        doc["ec_scale_factor"]      = cfg.ec_scale_factor;
        doc["temp_scale_factor"]    = cfg.temp_scale_factor;
        doc["read_temperature"]     = cfg.read_temperature;

        char buffer[384];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[SOIL_EC_RS485] error serializando config");
            return;
        }

        Serial.print("[SOIL_EC_RS485] publish config: ");
        Serial.println(buffer);
        if (!publish_message("growbox/soil_ec_rs485/config", buffer)) {
            Serial.println("[SOIL_EC_RS485] error MQTT config");
        }
    }

}