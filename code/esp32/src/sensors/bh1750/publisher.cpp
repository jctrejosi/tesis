#include "sensors/bh1750/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt/client.h"

namespace bh1750 {

    void Publisher::publish(const BH1750Data& data) {
        if (isnan(data.illuminance)) {
            Serial.println("[BH1750] dato inválido");
            return;
        }

        StaticJsonDocument<128> doc;

        doc["illuminance"] = data.illuminance;
        doc["unit"] = "lux";

        char buffer[128];
        serializeJson(doc, buffer, sizeof(buffer));

        Serial.print("[BH1750] publish: ");
        Serial.println(buffer);

        if (!publish_message("growbox/bh1750/data", buffer)) {
            Serial.println("[BH1750] error al publicar MQTT");
        }
    }

}