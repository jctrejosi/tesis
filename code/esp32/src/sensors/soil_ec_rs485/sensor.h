#pragma once

#include "sensors/soil_ec_rs485/driver.h"
#include "sensors/soil_ec_rs485/config.h"

namespace soil_ec_rs485 {

    class Sensor {
    private:
        SoilECDriver driver;
        Config config;

    public:
        void init();

        SoilECData read();

        bool begin();

        bool apply_config(const Config& cfg);
        Config get_config() const;

        void set_simulation(bool enabled);

        SoilECDriver& get_driver();
    };

}