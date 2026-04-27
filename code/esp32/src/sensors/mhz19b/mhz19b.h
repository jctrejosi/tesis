#pragma once
#include "sensors/mhz19b/config.h"

namespace mhz19b {

    class IMHZ19B {
    public:
        virtual bool begin() = 0;
        virtual MHZ19BData read() = 0;
        virtual ~IMHZ19B() {}
    };

}