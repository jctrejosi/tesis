#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include "sensors/bh1750/sensor.h"
#include "sensors/bh1750/publisher.h"
#include "sensors/bh1750/config_store.h"

#include "sensors/ds18b20/sensor.h"
#include "sensors/ds18b20/publisher.h"
#include "sensors/ds18b20/config_store.h"

#include <Arduino.h>

namespace sensors {

    static bme680::Sensor bme680;
    static bh1750::Sensor bh1750;
    static ds18b20::Sensor ds18b20;

    static unsigned long last_bme_sample = 0;
    static unsigned long last_bh_sample = 0;
    static unsigned long last_ds_sample = 0;

    void begin() {
        bme680.init();
        bh1750.init();
        ds18b20.init();

        unsigned long now = millis();
        last_bme_sample = now;
        last_bh_sample = now;
        last_ds_sample = now;
    }

    void update_individual() {
        unsigned long now = millis();

        unsigned long bme_interval = bme680.get_config().interval_ms;

        if (now - last_bme_sample >= bme_interval) {
            last_bme_sample = now;

            auto data = bme680.read();
            bme680::Publisher::publish(data);
        }

        unsigned long bh_interval = bh1750.get_config().interval_ms;

        if (now - last_bh_sample >= bh_interval) {
            last_bh_sample = now;

            auto data = bh1750.read();
            bh1750::Publisher::publish(data);
        }

        unsigned long ds_interval = ds18b20.get_config().interval_ms;

        if (now - last_ds_sample >= ds_interval) {
            last_ds_sample = now;

            auto data = ds18b20.read();
            ds18b20::Publisher::publish(data);
        }
    }

    void update_global_sync() {
        Serial.println("[SYNC] global synchronized sampling");

        auto bme_data = bme680.read();
        bme680::Publisher::publish(bme_data);

        auto bh_data = bh1750.read();
        bh1750::Publisher::publish(bh_data);

        auto ds_data = ds18b20.read();
        ds18b20::Publisher::publish(ds_data);
    }

    void publish_bme680_now() {
        auto data = bme680.read();
        bme680::Publisher::publish(data);
    }

    void publish_bh1750_now() {
        auto data = bh1750.read();
        bh1750::Publisher::publish(data);
    }

    void publish_ds18b20_now() {
        auto data = ds18b20.read();
        ds18b20::Publisher::publish(data);
    }

    bool apply_bme680_config(const bme680::Config& cfg) {
        if (bme680.apply_config(cfg)) {
            Serial.println("[BME680] config actualizada");
            return true;
        } else {
            Serial.println("[BME680] config inválida");
            return false;
        }
    }

    bool apply_bh1750_config(const bh1750::Config& cfg) {
        if (!bh1750.apply_config(cfg)) {
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

    bool apply_ds18b20_config(const ds18b20::Config& cfg) {
        if (!ds18b20.apply_config(cfg)) {
            Serial.println("[DS18B20] config inválida");
            return false;
        }

        if (!storage::save_ds18b20_config(cfg)) {
            Serial.println("[DS18B20] config aplicada, pero no se pudo guardar");
            return false;
        }

        Serial.println("[DS18B20] config actualizada");
        return true;
    }

}