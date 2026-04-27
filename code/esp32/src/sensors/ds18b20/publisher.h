#pragma once

#include "sensors/ds18b20/config.h"

namespace ds18b20 {

    class Publisher {
    public:
        static void publish(const DS18B20Data& data);
    };

}