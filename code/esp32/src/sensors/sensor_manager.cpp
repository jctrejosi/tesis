#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include <Arduino.h>

namespace sensors {

    static bme680::Sensor bme;

    static unsigned long last_bme_sample = 0;

    void begin() {
        bme.init();
        last_bme_sample = millis();
    }

    void update_individual() {
        unsigned long now = millis();

        unsigned long interval = bme.get_config().interval_ms;

        if (now - last_bme_sample >= interval) {
            last_bme_sample = now;

            bme680::BME680Data data = bme.read();
            bme680::Publisher::publish(data);
        }
    }

    void update_global_sync() {
        Serial.println("[SYNC] global synchronized sampling");

        bme680::BME680Data data = bme.read();
        bme680::Publisher::publish(data);
    }

    void publish_now() {
        bme680::BME680Data data = bme.read();
        bme680::Publisher::publish(data);
    }

    void apply_bme680_config(const bme680::Config& cfg) {
        if (bme.set_config(cfg)) {
            Serial.println("[BME680] config actualizada");
        } else {
            Serial.println("[BME680] config inválida");
        }
    }

}