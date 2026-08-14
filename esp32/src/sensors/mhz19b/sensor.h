#pragma once

#include "sensors/mhz19b/driver.h"
#include "sensors/mhz19b/config.h"

namespace mhz19b {

    class Sensor {
    private:
        MHZ19BDriver driver;

    public:
        void init();

        MHZ19BData read();

        bool apply_config(const Config& cfg);
        Config get_config() const;

        void set_simulation(bool enabled);

        MHZ19BDriver& get_driver();
    };

}