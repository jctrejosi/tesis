#pragma once

namespace bme680 {

    struct BME680Data {
        float temperature;
        float humidity;
        float pressure;
        float gas_resistance;
    };

    class IBME680 {
    public:
        virtual bool begin() = 0;
        virtual BME680Data read() = 0;
        virtual ~IBME680() {}
    };

}