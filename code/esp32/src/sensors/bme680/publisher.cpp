#include "sensors/bme680/publisher.h"
#include "mqtt/client.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace bme680 {

    bool Publisher::publish(const BME680Data& data) {
        StaticJsonDocument<256> json;  // aumentamos tamaño para el nuevo formato

        json["device_id"] = 1;
        json["timestamp"] = (const char*)nullptr;  // backend usará server time

        JsonObject metrics = json.createNestedObject("metrics");
        metrics["temperature"] = data.temperature;
        metrics["humidity"] = data.humidity;
        metrics["pressure"] = data.pressure;
        metrics["gas_resistance"] = data.gas_resistance;

        char payload[256];
        serializeJson(json, payload, sizeof(payload));

        static constexpr const char* TOPIC = "growbox/bme680/data";
        bool ok = publish_message(TOPIC, payload);

        if (ok) {
            Serial.print("[BME680] ");
            Serial.println(payload);
        } else {
            Serial.println("[BME680] publish failed");
        }

        return ok;
    }

    void Publisher::publish_config(const Config& cfg) {
        StaticJsonDocument<256> doc;
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
        if (!publish_message("growbox/bme680/config", buffer)) {
            Serial.println("[BME680] error MQTT config");
        }
    }

}