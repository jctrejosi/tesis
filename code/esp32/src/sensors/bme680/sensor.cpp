#include "sensors/bme680/sensor.h"
#include "sensors/bme680/driver.h"

#include <Arduino.h>

namespace bme680 {

  void Sensor::init() {
      driver.set_simulation_mode(false);

      if (!driver.begin()) {
          Serial.println("[BME680] init failed");
      } else {
          Serial.println("[BME680] ready");
      }
  }

  BME680Data Sensor::read() {
      return driver.read();
  }

  BME680Driver& Sensor::get_driver() {
      return driver;
  }

}