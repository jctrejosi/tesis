#pragma once

#include "sensors/soil_ec_rs485/config.h"
#include "sensors/soil_ec_rs485/soil_ec_rs485.h"

#include <Arduino.h>

namespace soil_ec_rs485 {

    class SoilECDriver {
    private:
        bool simulation_mode;
        bool hardware_ready;

        Config current_config;
        HardwareSerial* serial;

        void release_serial();
        void clear_serial();

        void set_transmit_mode();
        void set_receive_mode();

        bool send_request();
        bool read_response(uint8_t* buffer, size_t len);
        uint16_t calculate_crc(const uint8_t* data, size_t len) const;

    public:
        SoilECDriver();

        bool begin();
        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);
        Config get_config() const;

        SoilECData read();

        bool is_ready() const;

        ~SoilECDriver();
    };

}