#pragma once

#include "sensors/ds18b20/config.h"

namespace storage {

    bool save_ds18b20_config(const ds18b20::Config& cfg);

    ds18b20::Config load_ds18b20_config();

}