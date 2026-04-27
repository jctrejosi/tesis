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

    // instancias DS18B20
    static ds18b20::Sensor ds_soil;
    static ds18b20::Sensor ds_air;

    static unsigned long last_bme_sample = 0;
    static unsigned long last_bh_sample  = 0;

    static unsigned long last_ds_soil_sample = 0;
    static unsigned long last_ds_air_sample  = 0;

    void begin() {
        bme680.init();
        bh1750.init();

        // cargar configs diferenciadas
        ds_soil.init(storage::load_ds18b20_config("ds18b20_soil"));
        ds_air.init(storage::load_ds18b20_config("ds18b20_air"));

        unsigned long now = millis();

        last_bme_sample = now;
        last_bh_sample  = now;

        last_ds_soil_sample = now;
        last_ds_air_sample  = now;
    }

    void update_individual() {
        unsigned long now = millis();

        // ===== BME680 =====
        if (now - last_bme_sample >= bme680.get_config().interval_ms) {
            last_bme_sample = now;

            auto data = bme680.read();
            bme680::Publisher::publish(data);
        }

        // ===== BH1750 =====
        if (now - last_bh_sample >= bh1750.get_config().interval_ms) {
            last_bh_sample = now;

            auto data = bh1750.read();
            bh1750::Publisher::publish(data);
        }

        // ===== DS18B20 SUELO =====
        if (now - last_ds_soil_sample >= ds_soil.get_config().interval_ms) {
            last_ds_soil_sample = now;

            auto data = ds_soil.read();
            ds18b20::Publisher::publish("growbox/ds18b20/soil/data", data);
        }

        // ===== DS18B20 AIRE =====
        if (now - last_ds_air_sample >= ds_air.get_config().interval_ms) {
            last_ds_air_sample = now;

            auto data = ds_air.read();
            ds18b20::Publisher::publish("growbox/ds18b20/air/data", data);
        }
    }

    void update_global_sync() {
        Serial.println("[SYNC] global synchronized sampling");

        bme680::Publisher::publish(bme680.read());
        bh1750::Publisher::publish(bh1750.read());

        ds18b20::Publisher::publish("growbox/ds18b20/soil/data", ds_soil.read());
        ds18b20::Publisher::publish("growbox/ds18b20/air/data",  ds_air.read());
    }

    // ===== publish inmediato =====

    void publish_bme680_now() {
        bme680::Publisher::publish(bme680.read());
    }

    void publish_bh1750_now() {
        bh1750::Publisher::publish(bh1750.read());
    }

    void publish_ds18b20_now() {
        ds18b20::Publisher::publish("growbox/ds18b20/soil/data", ds_soil.read());
    }

    void publish_ds18b20_air_now() {
        ds18b20::Publisher::publish("growbox/ds18b20/air/data", ds_air.read());
    }

    // ===== config =====

    bool apply_bme680_config(const bme680::Config& cfg) {
        if (!bme680.apply_config(cfg)) {
            Serial.println("[BME680] config inválida");
            return false;
        }

        Serial.println("[BME680] config actualizada");
        return true;
    }

    bool apply_bh1750_config(const bh1750::Config& cfg) {
        if (!bh1750.apply_config(cfg)) {
            Serial.println("[BH1750] config inválida");
            return false;
        }

        storage::save_bh1750_config(cfg);
        Serial.println("[BH1750] config actualizada");
        return true;
    }

    bool apply_ds18b20_config(const ds18b20::Config& cfg) {
        if (!ds_soil.apply_config(cfg)) {
            Serial.println("[DS18B20-SOIL] config inválida");
            return false;
        }

        storage::save_ds18b20_config("ds18b20_soil", cfg);
        Serial.println("[DS18B20-SOIL] config actualizada");
        return true;
    }

    bool apply_ds18b20_air_config(const ds18b20::Config& cfg) {
        if (!ds_air.apply_config(cfg)) {
            Serial.println("[DS18B20-AIR] config inválida");
            return false;
        }

        storage::save_ds18b20_config("ds18b20_air", cfg);
        Serial.println("[DS18B20-AIR] config actualizada");
        return true;
    }

}