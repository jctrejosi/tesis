#pragma once

#include "sensors/bme680/driver.h"
#include "config.h"

namespace bme680 {

  class Sensor {
  private:
      BME680Driver driver;
      Config config;

  public:
      void init();

      // lectura bajo demanda
      BME680Data read();

      // configuración
      void set_config(const Config& cfg);
      Config get_config();

      // acceso avanzado (opcional)
      BME680Driver& get_driver();
  };

}