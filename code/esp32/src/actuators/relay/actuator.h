#pragma once

#include "actuators/relay/driver.h"
#include "actuators/relay/config.h"

namespace relay {

    class Sensor {

    private:
        RelayDriver driver;
        RelayConfig config;

    public:
        void init();

        RelayConfig get_config() const;

        bool apply_config(const RelayConfig& cfg);

        void set_channel(uint8_t channel, RelayState state);

        void set_all(RelayState state);

        RelayState get_channel(uint8_t channel) const;

        RelayDriver& get_driver();
    };

}