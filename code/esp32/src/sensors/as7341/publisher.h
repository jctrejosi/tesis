#pragma once

#include "sensors/as7341/driver.h"

namespace as7341 {

    class Publisher {
    public:
        static void publish(const AS7341Data& data);
    };

}