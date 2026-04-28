#pragma once

#include "sensors/soil_ec_rs485/driver.h"

namespace soil_ec_rs485 {

    class Publisher {
    public:
        static void publish(const SoilECData& data);
    };

}