#include "sensors/as7341/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt/client.h"

namespace as7341 {

    void Publisher::publish(const AS7341Data& data) {
        StaticJsonDocument<384> doc;

        doc["f1_415nm"] = data.f1_415nm;
        doc["f2_445nm"] = data.f2_445nm;
        doc["f3_480nm"] = data.f3_480nm;
        doc["f4_515nm"] = data.f4_515nm;
        doc["f5_555nm"] = data.f5_555nm;
        doc["f6_590nm"] = data.f6_590nm;
        doc["f7_630nm"] = data.f7_630nm;
        doc["f8_680nm"] = data.f8_680nm;
        doc["clear"] = data.clear;
        doc["nir"] = data.nir;

        char buffer[384];
        serializeJson(doc, buffer, sizeof(buffer));

        Serial.print("[AS7341] publish: ");
        Serial.println(buffer);

        if (!publish_message("growbox/as7341/data", buffer)) {
            Serial.println("[AS7341] error al publicar MQTT");
        }
    }

}