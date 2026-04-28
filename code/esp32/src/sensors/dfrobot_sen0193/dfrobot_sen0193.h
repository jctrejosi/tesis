#pragma once
#include <cstdint>

namespace dfrobot_sen0193 {

    // ===== data pura =====
    struct SoilMoistureData {
        float moisture_percent;   // 0–100%
        uint16_t raw_adc;         // lectura ADC
    };

    // ===== interfaz del sensor =====
    class ISensor {
    public:
        virtual bool begin() = 0;
        virtual SoilMoistureData read() = 0;
        virtual ~ISensor() {}
    };

}