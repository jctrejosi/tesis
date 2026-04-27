#pragma once

#include "sensors/bme680/bme680.h"
#include "sensors/bme680/driver.h"
#include "sensors/bme680/config.h"

namespace bme680 {

    class Sensor : public IBME680 {
    private:
        BME680Driver driver;

    public:
        void init();

        bool begin() override;
        BME680Data read() override;

        bool apply_config(const Config& cfg);
        Config get_config() const;

        BME680Driver& get_driver();
    };

}