#include "sensors/mhz19b/publisher.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt/client.h"
#include "mqtt/telemetry_publisher.h"

namespace mhz19b {

    void Publisher::publish(const MHZ19BData& data, const char* topic_suffix) {
        if (data.co2_ppm < 0) {
            Serial.println("[MHZ19B] dato inválido, no se publica");
            return;
        }

        JsonDocument doc;
        JsonObject metrics = doc.to<JsonObject>();
        metrics["co2"] = data.co2_ppm;

        publish_telemetry(topic_suffix ? topic_suffix : "mhz19b", metrics);
    }

    void Publisher::publish_config(const Config& cfg) {
        JsonDocument doc;
        doc["interval_ms"]      = cfg.interval_ms;
        doc["simulation"]       = cfg.simulation;
        doc["auto_calibration"] = cfg.auto_calibration;

        char buffer[128];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[MHZ19B] error serializando config");
            return;
        }

        Serial.print("[MHZ19B] publish config: ");
        Serial.println(buffer);
        if (!publish_message("growbox/mhz19b/config", buffer, MessagePriority::PRIORITY_HIGH)) {
            Serial.println("[MHZ19B] error MQTT config");
        }
    }
}