#pragma once

#include <Arduino.h>

#include "actuators/relay/relay.h"

namespace relay {

    class RelayDriver {

    private:
        RelayConfig config;

        uint8_t pins[4];

        void write_pin(uint8_t pin, bool state);

    public:
        RelayDriver();

        bool begin(const RelayConfig& cfg);

        void set_state(uint8_t channel, RelayState state);

        void set_all(RelayState state);

        RelayState get_state(uint8_t channel) const;

        RelayConfig get_config() const;

        bool apply_config(const RelayConfig& cfg);
    };

}