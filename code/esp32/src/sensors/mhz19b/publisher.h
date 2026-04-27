#pragma once

#include "sensors/mhz19b/driver.h"

namespace mhz19b {

    class Publisher {
    public:
        static void publish(const MHZ19BData& data, const char* topic_suffix = "mhz19b");
    };

}