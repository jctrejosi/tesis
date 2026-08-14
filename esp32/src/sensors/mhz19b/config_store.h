#pragma once

#include "sensors/mhz19b/config.h"

namespace storage {

    bool save_mhz19b_config(const mhz19b::Config& cfg);
    mhz19b::Config load_mhz19b_config();

}