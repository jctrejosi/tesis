#pragma once

#include "sensors/ds18b20/ds18b20.h"
#include "sensors/ds18b20/driver.h"

namespace ds18b20 {

    class Sensor : public IDS18B20 {
    private:
        DS18B20Driver driver;

    public:
        void init();

        DS18B20Data read() override;
        bool begin() override { return driver.begin(); }

        bool apply_config(const Config& cfg);

        Config get_config() const;

        void set_simulation(bool enabled);

        DS18B20Driver& get_driver();
    };

}