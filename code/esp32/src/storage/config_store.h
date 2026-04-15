#pragma once

#include "sensors/bme680/config.h"

namespace storage {

bool save_bme680_config(const bme680::Config& cfg);
bme680::Config load_bme680_config();

}