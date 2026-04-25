#pragma once

#include <Arduino.h>
#include "sensors/bh1750/config.h"

namespace bh1750 {

    class BH1750Driver {
    private:
        bool simulation_mode;
        bool hardware_ready;
        Config current_config;

    public:
        BH1750Driver();

        bool begin();

        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);

        Config get_config() const;

        BH1750Data read();

        bool is_ready() const;
    };

}