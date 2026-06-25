#include "telemetry_publisher.h"
#include "client.h"              // publish_message()
#include "device_config.h"
#include <ArduinoJson.h>

void publish_telemetry(const char* sensor_alias, const JsonObject& metrics, const char* timestamp) {
    StaticJsonDocument<512> doc;
    doc["device_id"] = get_device_id();
    if (timestamp) doc["timestamp"] = timestamp;
    else doc["timestamp"] = (const char*)nullptr;
    JsonObject metrics_obj = doc.createNestedObject("metrics");
    for (JsonPair kv : metrics) {
        metrics_obj[kv.key()] = kv.value();
    }
    char payload[512];
    serializeJson(doc, payload);
    char topic[64];
    snprintf(topic, sizeof(topic), "growbox/%s/data", sensor_alias);
    publish_message(topic, payload);
}