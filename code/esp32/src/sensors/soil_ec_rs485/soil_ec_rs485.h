#pragma once

namespace soil_ec_rs485 {

    struct SoilECData {
        float ec_raw;      // mS/cm
        float temperature;  // °C, si el sensor lo entrega
    };

    class ISOilEC {
    public:
        virtual bool begin() = 0;
        virtual SoilECData read() = 0;
        virtual ~ISOilEC() {}
    };

}