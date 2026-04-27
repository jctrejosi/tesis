#pragma once

#include <Arduino.h>
#include "sensors/ds18b20/config.h"

namespace ds18b20 {

    class DS18B20Driver {
    private:
        bool simulation_mode;
        bool hardware_ready;

        Config current_config;

    public:
        DS18B20Driver();

        bool begin();

        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);

        Config get_config() const;

        DS18B20Data read();

        bool is_ready() const;
    };

}