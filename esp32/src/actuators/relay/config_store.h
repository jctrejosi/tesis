#pragma once

#include "actuators/relay/config.h"

namespace storage {

    bool save_relay_config(const relay::RelayConfig& cfg);

    relay::RelayConfig load_relay_config();

}