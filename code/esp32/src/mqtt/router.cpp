#include "router.h"

#include "sensors/bme680/command_handler.h"
#include "sensors/as7341/command_handler.h"
#include "sensors/mhz19b/command_handler.h"
#include "sensors/soil_ec_rs485/command_handler.h"

#include "actuators/relay/command_handler.h"

#include <Arduino.h>
#include <cstring>

void route_message(
    const char* topic,
    const char* payload
) {

    char topic_copy[128];

    strncpy(
        topic_copy,
        topic,
        sizeof(topic_copy)
    );

    topic_copy[sizeof(topic_copy) - 1] = '\0';

    char* root = strtok(topic_copy, "/");
    char* module = strtok(nullptr, "/");
    char* command = strtok(nullptr, "/");

    if (
        root == nullptr ||
        module == nullptr ||
        command == nullptr
    ) {
        Serial.println("[ROUTER] topic inválido");
        return;
    }

    if (strcmp(root, "growbox") != 0) {
        return;
    }

    // =====================
    // BME680
    // =====================

    if (strcmp(module, "bme680") == 0) {
        if (strcmp(command, "read") == 0) {
            bme680::handle_read_command();
        } else if (strcmp(command, "config") == 0) {
            bme680::handle_config_command(payload);
        } else if (strcmp(command, "read_config") == 0) {   // <-- NUEVO
            bme680::handle_read_config_command();
        }
        return;
    }

    // =====================
    // AS7341
    // =====================

    if (strcmp(module, "as7341") == 0) {

        if (strcmp(command, "read") == 0) {
            as7341::handle_read_command();
        }

        else if (strcmp(command, "config") == 0) {
            as7341::handle_config_command(payload);
        }

        return;
    }

    // =====================
    // MHZ19B
    // =====================

    if (strcmp(module, "mhz19b") == 0) {

        if (strcmp(command, "read") == 0) {
            mhz19b::handle_read_command();
        }

        else if (strcmp(command, "config") == 0) {
            mhz19b::handle_config_command(payload);
        }

        return;
    }

    // =====================
    // SOIL EC RS485
    // =====================

    if (strcmp(module, "soil_ec_rs485") == 0) {

        if (strcmp(command, "read") == 0) {
            soil_ec_rs485::handle_read_command();
        }

        else if (strcmp(command, "config") == 0) {
            soil_ec_rs485::handle_config_command(payload);
        }

        return;
    }

    // =====================
    // RELAY
    // =====================

    if (strcmp(module, "relay") == 0) {
        if (strcmp(command, "read") == 0 || strcmp(command, "state") == 0) {
            relay::handle_read_command(payload);
        } else if (strcmp(command, "set") == 0) {
            relay::handle_set_command(payload);
        } else if (strcmp(command, "config") == 0) {
            relay::handle_config_command(payload);
        } else if (strcmp(command, "read_config") == 0) {   // <-- NUEVO
            relay::handle_read_config_command(payload);
        }
        return;
    }

    Serial.print("[ROUTER] módulo desconocido: ");
    Serial.println(module);
}