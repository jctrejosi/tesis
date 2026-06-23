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

}