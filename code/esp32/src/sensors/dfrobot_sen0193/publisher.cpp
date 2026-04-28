#include "publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>

#include "mqtt/client.h"

namespace dfrobot_sen0193 {

    void Publisher::publish(const SoilMoistureData& data) {

        // ===== validación básica =====
        if (isnan(data.moisture_percent)) {
            Serial.println("[SEN0193] dato inválido (NaN)");
            return;
        }

        StaticJsonDocument<128> doc;

        doc["moisture_percent"] = data.moisture_percent;
        doc["raw_adc"] = data.raw_adc;

        doc["unit"] = "percent";

        char buffer[128];

        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[SEN0193] error serializando JSON");
            return;
        }

        Serial.print("[SEN0193] publish: ");
        Serial.println(buffer);

        if (!publish_message("growbox/sen0193/data", buffer)) {
            Serial.println("[SEN0193] error al publicar MQTT");
        }
    }

}