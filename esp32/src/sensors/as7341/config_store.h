#pragma once

#include "sensors/as7341/config.h"

namespace storage {

    bool save_as7341_config(
        const as7341::Config& cfg
    );

    as7341::Config load_as7341_config();

}