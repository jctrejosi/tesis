#include "sensors/ds18b20/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>

#include "mqtt/client.h"

namespace ds18b20 {

    void Publisher::publish(const DS18B20Data& data) {
        // validar dato
        if (isnan(data.temperature)) {
            Serial.println("[DS18B20] dato inválido");
            return;
        }

        StaticJsonDocument<128> doc;

        doc["temperature"] = data.temperature;
        doc["unit"] = "celsius";

        char buffer[128];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[DS18B20] error serializando JSON");
            return;
        }

        Serial.print("[DS18B20] publish: ");
        Serial.println(buffer);

        if (!publish_message("growbox/ds18b20/data", buffer)) {
            Serial.println("[DS18B20] error al publicar MQTT");
        }
    }

}