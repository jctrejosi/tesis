#pragma once

#include "sensor.h"

namespace dfrobot_sen0193 {

    class Publisher {
    public:
        static void publish(const SoilMoistureData& data);
    };

}