#pragma once

#include "sensors/soil_ec_rs485/config.h"

namespace storage {

    bool save_soil_ec_rs485_config(const soil_ec_rs485::Config& cfg);
    soil_ec_rs485::Config load_soil_ec_rs485_config();

}