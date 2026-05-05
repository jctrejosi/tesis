#pragma once

#include "actuators/relay/actuator.h"

namespace relay {

    class Publisher {
    public:
        static void publish_state(uint8_t channel, RelayState state);
        static void publish_all_state(const Sensor& relay_sensor);
    };

}