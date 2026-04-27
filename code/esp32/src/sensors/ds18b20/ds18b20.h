#pragma once

#include "sensors/ds18b20/config.h"

namespace ds18b20 {

    class IDS18B20 {
    public:
        virtual bool begin() = 0;
        virtual DS18B20Data read() = 0;
        virtual ~IDS18B20() = default;
    };

}