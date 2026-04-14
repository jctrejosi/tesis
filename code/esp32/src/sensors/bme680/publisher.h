#pragma once

#include "sensors/bme680/driver.h"

namespace bme680 {

  class Publisher {
  public:
      // envía un dato ya leído
      static bool publish(const BME680Data& data);
  };

}