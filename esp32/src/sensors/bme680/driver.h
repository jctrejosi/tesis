#pragma once

#include "sensors/bme680/config.h"

namespace bme680 {

class BME680Driver {
public:
    BME680Driver();

    bool begin();
    bool apply_config(const Config& cfg);
    Config get_config() const;
    BME680Data read();

    void set_simulation_mode(bool enabled);

private:
    void apply_hardware_config();
    static uint8_t map_oversampling(uint8_t value);
    static uint8_t map_filter(uint8_t value);

    bool simulation_mode;
    bool hardware_ready;
    Config current_config;
};

}