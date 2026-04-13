#include "bme680_publisher.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include "mqtt_client.h"
#include "config.h"

bool publish_bme680_data(BME680Driver& bme680_driver) {
    BME680Data bme680_data = bme680_driver.read();

    StaticJsonDocument<256> bme680_json;
    bme680_json["temperature"] = bme680_data.temperature;
    bme680_json["humidity"] = bme680_data.humidity;
    bme680_json["pressure"] = bme680_data.pressure;
    bme680_json["gas"] = bme680_data.gas_resistance;

    char mqtt_payload[256];
    serializeJson(bme680_json, mqtt_payload);

    bool published = publish_message(MQTT_TOPIC_BME680, mqtt_payload);

    Serial.print("[BME680] ");
    Serial.println(mqtt_payload);

    return published;
}