#pragma once

#include "sensors/bme680/config.h"

namespace bme680 {

    struct BME680Data {
        float temperature;
        float humidity;
        float pressure;
        float gas_resistance;
    };

    class BME680Driver {
    private:
        bool simulation_mode;
        bool hardware_ready;
        Config current_config;

        void apply_hardware_config();

        static uint8_t map_oversampling(uint8_t value);
        static uint8_t map_filter(uint8_t value);

    public:
        BME680Driver();

        bool begin();
        void set_simulation_mode(bool enabled);

        bool apply_config(const Config& cfg);
        Config get_config() const;

        BME680Data read();
    };

}