#pragma once

#include "sensors/dfrobot_sen0193/config.h"

namespace storage {

    bool save_dfrobot_sen0193_config(const dfrobot_sen0193::Config& cfg);

    dfrobot_sen0193::Config load_dfrobot_sen0193_config();

}