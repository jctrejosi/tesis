#include "router.h"

#include "sensors/bme680/command_handler.h"
#include "sensors/bh1750/command_handler.h"
#include "sensors/ds18b20/command_handler.h"
#include "sensors/mhz19b/command_handler.h"

#include <cstring>

void route_message(const char* topic, const char* payload) {

    char topic_copy[64];
    strncpy(topic_copy, topic, sizeof(topic_copy));
    topic_copy[sizeof(topic_copy) - 1] = '\0';

    char* base = strtok(topic_copy, "/");
    char* sensor = strtok(NULL, "/");
    char* target  = strtok(NULL, "/");
    char* command = strtok(NULL, "/");

    if (!base || !sensor || !command) return;
    if (strcmp(base, "growbox") != 0) return;

    // ===== BME680 =====
    if (strcmp(sensor, "bme680") == 0) {

        if (strcmp(command, "read") == 0) {
            bme680::handle_read_command();
        } else if (strcmp(command, "config") == 0) {
            bme680::handle_config_command(payload);
        }
    }

    // ===== BH1750 =====
    else if (strcmp(sensor, "bh1750") == 0) {

        if (strcmp(command, "read") == 0) {
            bh1750::handle_read_command();
        } else if (strcmp(command, "config") == 0) {
            bh1750::handle_config_command(payload);
        }
    }

    // ===== DS18B20 =====
    else if (strcmp(sensor, "ds18b20") == 0) {

        if (strcmp(command, "read") == 0) {
            ds18b20::handle_read_command();
        } else if (strcmp(command, "config") == 0) {
            ds18b20::handle_config_command(payload);
        }
    }

    // ===== MH-Z19B =====
    else if (strcmp(sensor, "mhz19b") == 0) {

        if (strcmp(command, "read") == 0) {
            mhz19b::handle_read_command();
        } else if (strcmp(command, "config") == 0) {
            mhz19b::handle_config_command(payload);
        }
    }
}