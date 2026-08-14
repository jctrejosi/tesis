#pragma once

namespace soil_ec_rs485 {

    void handle_read_command();
    void handle_config_command(const char* payload);
    void handle_read_config_command();

}