#include "sensors/soil_ec_rs485/publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>
#include <math.h>

#include "mqtt/client.h"

namespace soil_ec_rs485 {

    void Publisher::publish(const SoilECData& data) {

        // ===== validación básica =====
        if (isnan(data.ec_raw)) {
            Serial.println("[SOIL_EC_RS485] EC inválido");
            return;
        }

        StaticJsonDocument<192> doc;

        doc["ec_mS_cm"] = data.ec_raw;

        if (!isnan(data.temperature)) {
            doc["temperature_c"] = data.temperature;
        } else {
            doc["temperature_c"] = nullptr;
        }

        doc["unit"] = "mS/cm";

        char buffer[192];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[SOIL_EC_RS485] error serializando JSON");
            return;
        }

        Serial.print("[SOIL_EC_RS485] publish: ");
        Serial.println(buffer);

        if (!publish_message("growbox/soil_ec_rs485/data", buffer)) {
            Serial.println("[SOIL_EC_RS485] error MQTT");
        }
    }

}