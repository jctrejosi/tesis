#pragma once

#include "sensors/bme680/config.h"

namespace bme680 {

    class IBME680 {
    public:
        virtual void begin() = 0;
        virtual BME680Data read() = 0;
        virtual ~IBME680() = default;
    };

}