#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include <Arduino.h>

namespace sensors {

    static bme680::Sensor bme;
    static unsigned long last_sample = 0;

    void begin() {
        bme.init();
        last_sample = millis();
    }

    void update() {
        unsigned long now = millis();

        bme680::Config cfg = bme.get_config();
        unsigned long interval = cfg.interval_ms;

        if (now - last_sample >= interval) {
            last_sample = now;

            bme680::BME680Data data = bme.read();
            bme680::Publisher::publish(data);
        }
    }

}