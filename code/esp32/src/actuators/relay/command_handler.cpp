#include "actuators/relay/command_handler.h"
#include "actuators/relay/actuator.h"
#include "actuators/relay/publisher.h"
#include "actuators/relay/config.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <cstring>

namespace relay {

Sensor& get_relay_sensor() {
    static Sensor sensor;
    static bool initialized = false;
    if (!initialized) {
        sensor.init();
        initialized = true;
    }
    return sensor;
}

void handle_read_command(const char* payload) {
    (void)payload;
    Publisher::publish_all_state(get_relay_sensor());
}

void handle_set_command(const char* payload) {
    JsonDocument doc;  // channel + state
    DeserializationError err = deserializeJson(doc, payload);

    if (err) {
        Serial.println("[RELAY] JSON inválido");
        return;
    }

    int channel = doc["channel"] | -1;
    if (channel < 1 || channel > 4) {
        Serial.println("[RELAY] canal inválido");
        return;
    }

    const char* state_str = doc["state"] | "";
    RelayState state;

    if (strcmp(state_str, "ON") == 0) {
        state = RelayState::ON;
    } else if (strcmp(state_str, "OFF") == 0) {
        state = RelayState::OFF;
    } else {
        Serial.println("[RELAY] estado inválido");
        return;
    }

    get_relay_sensor().set_channel(static_cast<uint8_t>(channel), state);
    Publisher::publish_state(static_cast<uint8_t>(channel), state);
}

void handle_config_command(const char* payload) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (err) {
        Serial.println("[RELAY] config JSON inválido");
        return;
    }

    Sensor& relay_sensor = get_relay_sensor();
    RelayConfig cfg = relay_sensor.get_config();

    if (!doc["pin_in1"].isNull())  cfg.pin_in1  = doc["pin_in1"];
    if (!doc["pin_in2"].isNull())  cfg.pin_in2  = doc["pin_in2"];
    if (!doc["pin_in3"].isNull())  cfg.pin_in3  = doc["pin_in3"];
    if (!doc["pin_in4"].isNull())  cfg.pin_in4  = doc["pin_in4"];
    if (!doc["inverted"].isNull()) cfg.inverted = doc["inverted"];
    if (!doc["simulation"].isNull()) cfg.simulation = doc["simulation"];
    if (!doc["interval_ms"].isNull()) cfg.interval_ms = doc["interval_ms"];
    if (!doc["publish_interval_ms"].isNull()) cfg.publish_interval_ms = doc["publish_interval_ms"];

    if (!validate_config(cfg)) {
        Serial.println("[RELAY] config inválida");
        return;
    }

    if (!relay_sensor.apply_config(cfg)) {
        Serial.println("[RELAY] no se pudo aplicar config");
        return;
    }

    Serial.println("[RELAY] config aplicada");
}

void handle_read_config_command(const char* payload) {
    (void)payload;
    Publisher::publish_config(get_relay_sensor());
}

}