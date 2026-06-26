#include "sensors/bme680/publisher.h"
#include "mqtt/client.h"
#include "mqtt/telemetry_publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace bme680 {

    bool Publisher::publish(const BME680Data& data) {
        JsonDocument doc;
        JsonObject metrics = doc.to<JsonObject>();

        metrics["temperature"]   = data.temperature;
        metrics["humidity"]      = data.humidity;
        metrics["pressure"]      = data.pressure;
        metrics["gas_resistance"] = data.gas_resistance;

        publish_telemetry("bme680", metrics);

        Serial.print("[BME680] published: ");
        serializeJson(doc, Serial);
        Serial.println();
        return true;
    }

    void Publisher::publish_config(const Config& cfg) {
        JsonDocument doc;
        doc["interval_ms"]       = cfg.interval_ms;
        doc["simulation"]        = cfg.simulation;
        doc["temp_oversample"]   = cfg.temp_oversample;
        doc["hum_oversample"]    = cfg.hum_oversample;
        doc["press_oversample"]  = cfg.press_oversample;
        doc["iir_filter"]        = cfg.iir_filter;
        doc["gas_heater_temp"]   = cfg.gas_heater_temp;
        doc["gas_heater_duration"] = cfg.gas_heater_duration;

        char buffer[256];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[BME680] error serializando config");
            return;
        }

        Serial.print("[BME680] publish config: ");
        Serial.println(buffer);
        if (!publish_message("growbox/bme680/config", buffer, MessagePriority::HIGH)) {
            Serial.println("[BME680] error MQTT config");
        }
    }

}