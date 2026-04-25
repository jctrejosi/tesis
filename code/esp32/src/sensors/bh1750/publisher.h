#pragma once

#include "sensors/bh1750/driver.h"

namespace bh1750 {

    class Publisher {
    public:
        static void publish(const BH1750Data& data);
    };

}