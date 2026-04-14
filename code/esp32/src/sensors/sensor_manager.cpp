#include "sensors/sensor_manager.h"

#include "bme680/driver.h"
#include "bme680/publisher.h"

#include <Arduino.h>

namespace sensors {

    static bme680::BME680Driver bme;

    static unsigned long last_sample = 0;
    static unsigned long interval = 5000;

    void begin() {
        bme.set_simulation_mode(true);

        if (!bme.begin()) {
            Serial.println("BME680 init failed");
        }
    }

    void update() {
        unsigned long now = millis();

        if (now - last_sample >= interval) {
            last_sample = now;

            bme680::BME680Data data = bme.read();
            bme680::Publisher::publish(data);
        }
    }

}