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

        bool read_response(uint8_t* buffer, size_t len);
        void clear_serial();

        bool send_request();

    public:
        SoilECDriver();

        bool begin();

        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);
        Config get_config() const;

        SoilECData read();

        bool is_ready() const;
    };

}