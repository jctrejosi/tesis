#pragma once

#include <Arduino.h>
#include "sensors/dfrobot_sen0193/dfrobot_sen0193.h"

namespace dfrobot_sen0193 {

    class DFRobotSEN0193Driver : public ISensor {

    private:
        uint8_t adc_pin;

        bool simulation_mode;

        // calibración
        uint16_t dry_value;
        uint16_t wet_value;

        // filtro simple
        uint32_t last_filtered;

        uint32_t read_raw();

        float map_to_percent(uint16_t raw);

    public:
        DFRobotSEN0193Driver();

        bool begin() override;

        SoilMoistureData read() override;

        void set_simulation_mode(bool enabled);

        void set_calibration(uint16_t dry, uint16_t wet);

        void set_pin(uint8_t pin);
    };

}