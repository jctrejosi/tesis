#include "sensors/bme680/publisher.h"
#include "mqtt/client.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace bme680 {

    bool Publisher::publish(const BME680Data& data) {
        StaticJsonDocument<128> json;

        json["temperature"] = data.temperature;
        json["humidity"] = data.humidity;
        json["pressure"] = data.pressure;
        json["gas"] = data.gas_resistance;

        char payload[128];
        serializeJson(json, payload, sizeof(payload));

        static constexpr const char* TOPIC = "growbox/bme680/data";
        bool ok = publish_message(TOPIC, payload);

        if (ok) {
            Serial.print("[BME680] ");
            Serial.println(payload);
        } else {
            Serial.println("[BME680] publish failed");
        }

        return ok;
    }

}