#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include "sensors/bh1750/sensor.h"
#include "sensors/bh1750/publisher.h"
#include "sensors/bh1750/config_store.h"

#include <Arduino.h>

namespace sensors {

    static bme680::Sensor bme;
    static bh1750::Sensor light;

    static unsigned long last_bme_sample = 0;
    static unsigned long last_bh_sample = 0;

    void begin() {
        bme.init();
        light.init();

        unsigned long now = millis();
        last_bme_sample = now;
        last_bh_sample = now;
    }

    void update_individual() {
        unsigned long now = millis();

        unsigned long bme_interval = bme.get_config().interval_ms;

        if (now - last_bme_sample >= bme_interval) {
            last_bme_sample = now;

            auto data = bme.read();
            bme680::Publisher::publish(data);
        }

        unsigned long bh_interval = light.get_config().interval_ms;

        if (now - last_bh_sample >= bh_interval) {
            last_bh_sample = now;

            auto data = light.read();
            bh1750::Publisher::publish(data);
        }
    }

    void update_global_sync() {
        Serial.println("[SYNC] global synchronized sampling");

        auto bme_data = bme.read();
        bme680::Publisher::publish(bme_data);

        auto bh_data = light.read();
        bh1750::Publisher::publish(bh_data);
    }

    void publish_bme680_now() {
        auto data = bme.read();
        bme680::Publisher::publish(data);
    }

    void publish_bh1750_now() {
        auto data = light.read();
        bh1750::Publisher::publish(data);
    }

    bool apply_bme680_config(const bme680::Config& cfg) {
        if (bme.set_config(cfg)) {
            Serial.println("[BME680] config actualizada");
            return true;
        } else {
            Serial.println("[BME680] config inválida");
            return false;
        }
    }

    bool apply_bh1750_config(const bh1750::Config& cfg) {
        if (!light.apply_config(cfg)) {
            Serial.println("[BH1750] config inválida");
            return false;
        }

        if (!storage::save_bh1750_config(cfg)) {
            Serial.println("[BH1750] config aplicada, pero no se pudo guardar");
            return false;
        }

        Serial.println("[BH1750] config actualizada");
        return true;
    }

}