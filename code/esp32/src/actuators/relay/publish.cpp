#include "publisher.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "mqtt/client.h"

namespace relay {

    static const char* base_topic = "growbox/relay";

    static const char* state_to_str(RelayState state) {
        return (state == RelayState::ON) ? "ON" : "OFF";
    }

    void Publisher::publish_state(uint8_t channel, RelayState state) {

        if (channel < 1 || channel > 4) {
            Serial.println("[RELAY] canal inválido");
            return;
        }

        StaticJsonDocument<64> doc;

        doc["channel"] = channel;
        doc["state"]   = state_to_str(state);

        char buffer[64];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));

        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[RELAY] error serializando JSON");
            return;
        }

        char topic[64];
        snprintf(topic, sizeof(topic),
                 "%s/%d/state",
                 base_topic,
                 channel);

        Serial.print("[RELAY] publish ");
        Serial.print(topic);
        Serial.print(" -> ");
        Serial.println(buffer);

        if (!publish_message(topic, buffer)) {
            Serial.println("[RELAY] error MQTT publish");
        }
    }

    void Publisher::publish_all_state(const Sensor& relay_sensor) {

        for (uint8_t i = 1; i <= 4; i++) {
            RelayState state = relay_sensor.get_channel(i);
            publish_state(i, state);
        }
    }

}