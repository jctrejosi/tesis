#pragma once

namespace ds18b20 {

    void handle_read_command();

    void handle_config_command(const char* payload);

}