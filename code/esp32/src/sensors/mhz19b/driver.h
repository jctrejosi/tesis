#pragma once

#include <Arduino.h>
#include "sensors/mhz19b/config.h"

namespace mhz19b {

    class MHZ19BDriver {
    private:
        bool simulation_mode;
        bool hardware_ready;
        Config current_config;

        HardwareSerial* serial;

        // interno
        bool send_read_command();
        bool read_response(uint8_t* buffer, size_t len);
        uint8_t calculate_checksum(uint8_t* packet);

        void apply_hardware_config();

    public:
        MHZ19BDriver();

        bool begin();
        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);
        Config get_config() const;

        MHZ19BData read();

        bool is_ready() const;
    };

}