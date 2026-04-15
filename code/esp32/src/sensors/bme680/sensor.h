#pragma once

#include "sensors/bme680/driver.h"
#include "sensors/bme680/config.h"

namespace bme680 {

  class Sensor {
  private:
      BME680Driver driver;
      Config config;

  public:
      void init();

      BME680Data read();

      bool set_config(const Config& cfg);
      Config get_config() const;

      BME680Driver& get_driver();
  };

}