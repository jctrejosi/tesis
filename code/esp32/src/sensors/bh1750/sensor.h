#pragma once

#include "sensors/as7341/driver.h"

namespace as7341 {

    class Sensor {
    private:
        AS7341Driver driver;
        Config config;

    public:
        Sensor();

        void init();

        AS7341Data read();

        bool set_config(const Config& cfg);

        Config get_config() const;

        void set_simulation(bool enabled);

        AS7341Driver& get_driver();
    };

}