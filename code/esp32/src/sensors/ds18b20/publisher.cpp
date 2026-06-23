#include "sensors/ds18b20/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>

#include "mqtt/client.h"

namespace ds18b20 {

    void Publisher::publish(const char* topic, const DS18B20Data& data) {
        if (isnan(data.temperature)) {
            Serial.println("[DS18B20] dato inválido");
            return;
        }

        StaticJsonDocument<256> doc;

        doc["device_id"] = 1;
        doc["timestamp"] = (const char*)nullptr;

        JsonObject metrics = doc.createNestedObject("metrics");
        metrics["temperature"] = data.temperature;

        char buffer[256];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[DS18B20] error serializando JSON");
            return;
        }

        Serial.print("[DS18B20] publish: ");
        Serial.print(topic);
        Serial.print(" -> ");
        Serial.println(buffer);

        if (!publish_message(topic, buffer)) {
            Serial.println("[DS18B20] error al publicar MQTT");
        }
    }

}