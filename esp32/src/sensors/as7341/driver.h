#pragma once

#include <Arduino.h>

#include "sensors/as7341/config.h"

namespace as7341 {

    struct AS7341Data {

        uint16_t f1_415nm;
        uint16_t f2_445nm;
        uint16_t f3_480nm;
        uint16_t f4_515nm;
        uint16_t f5_555nm;

        uint16_t f6_590nm;
        uint16_t f7_630nm;
        uint16_t f8_680nm;

        uint16_t clear;
        uint16_t nir;
    };

    class AS7341Driver {

    private:

        bool simulation_mode;
        bool hardware_ready;

        Config current_config;

        void apply_hardware_config();

        uint8_t map_gain(uint16_t gain);

    public:

        AS7341Driver();

        bool begin();

        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);

        Config get_config() const;

        AS7341Data read();

        bool is_ready() const;
    };

}