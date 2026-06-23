#include "sensors/bme680/publisher.h"
#include "mqtt/client.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace bme680 {

    bool Publisher::publish(const BME680Data& data) {
        StaticJsonDocument<256> json;  // aumentamos tamaño para el nuevo formato

        json["device_id"] = 1;
        json["timestamp"] = (const char*)nullptr;  // backend usará server time

        JsonObject metrics = json.createNestedObject("metrics");
        metrics["temperature"] = data.temperature;
        metrics["humidity"] = data.humidity;
        metrics["pressure"] = data.pressure;
        metrics["gas_resistance"] = data.gas_resistance;

        char payload[256];
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