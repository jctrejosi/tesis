#include "sensors/mhz19b/publisher.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt/client.h"

namespace mhz19b {

    void Publisher::publish(const MHZ19BData& data, const char* topic_suffix) {
        if (data.co2_ppm < 0) {
            Serial.println("[MHZ19B] dato inválido");
            return;
        }

        StaticJsonDocument<256> doc;
        doc["device_id"] = 1;
        doc["timestamp"] = (const char*)nullptr;

        JsonObject metrics = doc.createNestedObject("metrics");
        metrics["co2"] = data.co2_ppm;

        char buffer[256];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[MHZ19B] error serializando JSON");
            return;
        }

        char topic[64];
        snprintf(topic, sizeof(topic), "growbox/%s/data", topic_suffix ? topic_suffix : "mhz19b");

        Serial.print("[MHZ19B] publish: ");
        Serial.println(buffer);

        if (!publish_message(topic, buffer)) {
            Serial.println("[MHZ19B] error al publicar MQTT");
        }
    }
}