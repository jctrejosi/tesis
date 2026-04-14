#pragma once

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

    public:
        BME680Driver();

        bool begin();
        void set_simulation_mode(bool enabled);
        BME680Data read();
    };

}