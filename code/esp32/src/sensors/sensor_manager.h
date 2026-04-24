#pragma once

#include "sensors/bme680/config.h"

namespace sensors {

  void begin();

  void update_individual();
  void update_global_sync();

  void publish_now();
  bool apply_bme680_config(const bme680::Config& cfg);

}