#pragma once

#include <Arduino.h>

namespace relay {

    enum class RelayState : uint8_t {
        OFF = 0,
        ON  = 1
    };

}