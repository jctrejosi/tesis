#include "command_handler.h"

#include <Arduino.h>
#include <ArduinoJson.h>

#include "sensor.h"
#include "publisher.h"

#include "sensors/sensor_manager.h"

namespace relay {

    // referencia global (en sensor_manager)
    extern Sensor relay_sensor;

    void handle_read_command(const char* payload) {
        (void)payload;

        // publica estado completo
        Publisher::publish_all_state(relay_sensor);
    }

    void handle_set_command(const char* payload) {

        StaticJsonDocument<128> doc;

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

        relay_sensor.set_channel(channel, state);

        Publisher::publish_state(channel, state);
    }

    void handle_config_command(const char* payload) {

        StaticJsonDocument<256> doc;

        DeserializationError err = deserializeJson(doc, payload);

        if (err) {
            Serial.println("[RELAY] config JSON inválido");
            return;
        }

        RelayConfig cfg = relay_sensor.get_config();

        if (doc.containsKey("pin_in1")) cfg.pin_in1 = doc["pin_in1"];
        if (doc.containsKey("pin_in2")) cfg.pin_in2 = doc["pin_in2"];
        if (doc.containsKey("pin_in3")) cfg.pin_in3 = doc["pin_in3"];
        if (doc.containsKey("pin_in4")) cfg.pin_in4 = doc["pin_in4"];

        if (doc.containsKey("inverted")) cfg.inverted = doc["inverted"];
        if (doc.containsKey("simulation")) cfg.simulation = doc["simulation"];

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

}