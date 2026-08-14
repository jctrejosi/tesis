#pragma once

namespace relay {
    class Sensor;
    void handle_read_command(const char* payload);
    void handle_set_command(const char* payload);
    void handle_config_command(const char* payload);
    void handle_read_config_command(const char* payload = nullptr);
    Sensor& get_relay_sensor();
}