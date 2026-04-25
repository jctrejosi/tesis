#pragma once

#include "sensors/bh1750/driver.h"

namespace bh1750 {

    class Sensor {
    private:
        BH1750Driver driver;

    public:
        void init();

        BH1750Data read();

        void set_simulation(bool enabled);

        bool apply_config(const Config& cfg);

        Config get_config() const;

        BH1750Driver& get_driver();
    };

}