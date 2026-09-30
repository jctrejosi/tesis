#pragma once

#include "sensors/bme680/driver.h"

namespace bme680 {

  class Publisher {
  public:
    static bool publish(const BME680Data& data, bool simulated = false);
    static void publish_config(const Config& cfg);
  };

}