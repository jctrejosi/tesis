#pragma once

#include "sensors/bh1750/config.h"

namespace storage {

    bool save_bh1750_config(const bh1750::Config& cfg);
    bh1750::Config load_bh1750_config();

}