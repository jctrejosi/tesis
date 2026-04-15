#include "router.h"

#include "sensors/bme680/command_handler.h"

#include <cstring>

void route_message(const char* topic, const char* payload) {

    if (strcmp(topic, "growbox/bme680/read") == 0) {
        bme680::handle_read_command();
    }

    else if (strcmp(topic, "growbox/bme680/config") == 0) {
        bme680::handle_config_command(payload);
    }
}