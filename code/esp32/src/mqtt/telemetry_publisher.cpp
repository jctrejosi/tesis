#include "telemetry_publisher.h"
#include "client.h"
#include "device_config.h"
#include <ArduinoJson.h>
#include <esp_timer.h>   // Para esp_timer_get_time()
#include "message_queue.h"

void publish_telemetry(const char* sensor_alias, const JsonObject& metrics, const char* timestamp) {
    JsonDocument doc;
    doc["device_id"] = get_device_id();

    // Si se proporciona un timestamp explícito se usa como cadena; si no, se
    // envía el reloj interno en microsegundos desde el arranque.
    if (timestamp) {
        doc["timestamp"] = timestamp;
    } else {
        doc["timestamp"] = (uint64_t)esp_timer_get_time();
    }

    JsonObject metrics_obj = doc["metrics"].to<JsonObject>();
    for (JsonPair kv : metrics) {
        metrics_obj[kv.key()] = kv.value();
    }

    char payload[512];
    serializeJson(doc, payload);

    char topic[64];
    snprintf(topic, sizeof(topic), "growbox/%s/data", sensor_alias);
    publish_message(topic, payload, MessagePriority::LOW);
}