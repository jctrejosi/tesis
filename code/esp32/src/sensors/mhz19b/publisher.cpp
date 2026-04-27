#include "sensors/mhz19b/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "mqtt/client.h"

namespace mhz19b {

    void Publisher::publish(const MHZ19BData& data, const char* topic_suffix) {
        // validar dato
        if (data.co2_ppm < 0) {
            Serial.println("[MHZ19B] dato inválido");
            return;
        }

        StaticJsonDocument<128> doc;

        doc["co2"] = data.co2_ppm;
        doc["unit"] = "ppm";

        char buffer[128];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[MHZ19B] error serializando JSON");
            return;
        }

        // construir topic dinámico
        char topic[64];
        snprintf(topic, sizeof(topic), "growbox/%s/data", topic_suffix);

        Serial.print("[MHZ19B] publish: ");
        Serial.println(buffer);

        if (!publish_message(topic, buffer)) {
            Serial.println("[MHZ19B] error al publicar MQTT");
        }
    }

}