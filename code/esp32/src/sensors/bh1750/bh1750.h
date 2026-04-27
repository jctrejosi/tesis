#pragma once

#include "sensors/bh1750/config.h"

namespace bh1750 {

    class IBH1750 {
    public:
        virtual bool begin() = 0;
        virtual BH1750Data read() = 0;
        virtual ~IBH1750() = default;
    };

}