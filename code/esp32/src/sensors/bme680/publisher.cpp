#include "sensors/bme680/publisher.h"
#include "mqtt/client.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace bme680 {

    bool Publisher::publish(const BME680Data& data) {

        JsonDocument json;

        json["temperature"] = data.temperature;
        json["humidity"]    = data.humidity;
        json["pressure"]    = data.pressure;
        json["gas"]         = data.gas_resistance;

        char payload[128];
        serializeJson(json, payload);

        bool ok = publish_message("growbox/bme680", payload);

        if (ok) {
            Serial.print("[BME680] ");
            Serial.println(payload);
        } else {
            Serial.println("[BME680] publish failed");
        }

        return ok;
    }

}