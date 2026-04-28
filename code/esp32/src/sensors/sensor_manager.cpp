#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include "sensors/bh1750/sensor.h"
#include "sensors/bh1750/publisher.h"
#include "sensors/bh1750/config_store.h"

#include "sensors/ds18b20/sensor.h"
#include "sensors/ds18b20/publisher.h"
#include "sensors/ds18b20/config_store.h"

#include "sensors/mhz19b/sensor.h"
#include "sensors/mhz19b/publisher.h"
#include "sensors/mhz19b/config_store.h"

#include "sensors/soil_ec_rs485/sensor.h"
#include "sensors/soil_ec_rs485/publisher.h"
#include "sensors/soil_ec_rs485/config_store.h"

#include <Arduino.h>

namespace sensors {

    // ===== sensores únicos =====
    static bme680::Sensor bme680;
    static bh1750::Sensor bh1750;
    static mhz19b::Sensor mhz19b;
    static soil_ec_rs485::Sensor soil_ec;

    // ===== DS18B20 (único caso multi-instancia válido) =====
    static ds18b20::Sensor ds_soil;
    static ds18b20::Sensor ds_air;

    // ===== timers =====
    static unsigned long last_bme = 0;
    static unsigned long last_bh  = 0;

    static unsigned long last_ds_soil = 0;
    static unsigned long last_ds_air  = 0;

    static unsigned long last_co2 = 0;
    static unsigned long last_ec  = 0;

    // =========================================================
    void begin() {

        bme680.init();
        bh1750.init();
        mhz19b.init();
        soil_ec.init();

        ds_soil.init(storage::load_ds18b20_config("ds18b20_soil"));
        ds_air.init(storage::load_ds18b20_config("ds18b20_air"));

        unsigned long now = millis();

        last_bme = now;
        last_bh  = now;

        last_ds_soil = now;
        last_ds_air  = now;

        last_co2 = now;
        last_ec  = now;
    }

    // =========================================================
    void update_individual() {

        unsigned long now = millis();

        // ===== BME680 =====
        if (now - last_bme >= bme680.get_config().interval_ms) {
            last_bme = now;
            bme680::Publisher::publish(bme680.read());
        }

        // ===== BH1750 =====
        if (now - last_bh >= bh1750.get_config().interval_ms) {
            last_bh = now;
            bh1750::Publisher::publish(bh1750.read());
        }

        // ===== DS18B20 SOIL =====
        if (now - last_ds_soil >= ds_soil.get_config().interval_ms) {
            last_ds_soil = now;
            ds18b20::Publisher::publish("growbox/ds18b20/soil/data", ds_soil.read());
        }

        // ===== DS18B20 AIR =====
        if (now - last_ds_air >= ds_air.get_config().interval_ms) {
            last_ds_air = now;
            ds18b20::Publisher::publish("growbox/ds18b20/air/data", ds_air.read());
        }

        // ===== MH-Z19B =====
        if (now - last_co2 >= mhz19b.get_config().interval_ms) {
            last_co2 = now;
            mhz19b::Publisher::publish(mhz19b.read());
        }

        // ===== SOIL EC RS485 =====
        if (now - last_ec >= soil_ec.get_config().interval_ms) {
            last_ec = now;
            soil_ec_rs485::Publisher::publish(soil_ec.read());
        }
    }

    // =========================================================
    void update_global_sync() {

        Serial.println("[SYNC] global sampling");

        bme680::Publisher::publish(bme680.read());
        bh1750::Publisher::publish(bh1750.read());

        ds18b20::Publisher::publish("growbox/ds18b20/soil/data", ds_soil.read());
        ds18b20::Publisher::publish("growbox/ds18b20/air/data", ds_air.read());

        mhz19b::Publisher::publish(mhz19b.read());
        soil_ec_rs485::Publisher::publish(soil_ec.read());
    }

    // =========================================================
    // publish inmediato

    void publish_bme680_now() {
        bme680::Publisher::publish(bme680.read());
    }

    void publish_bh1750_now() {
        bh1750::Publisher::publish(bh1750.read());
    }

    void publish_ds18b20_soil_now() {
        ds18b20::Publisher::publish("growbox/ds18b20/soil/data", ds_soil.read());
    }

    void publish_ds18b20_air_now() {
        ds18b20::Publisher::publish("growbox/ds18b20/air/data", ds_air.read());
    }

    void publish_mhz19b_now() {
        mhz19b::Publisher::publish(mhz19b.read());
    }

    void publish_soil_ec_rs485_now() {
        soil_ec_rs485::Publisher::publish(soil_ec.read());
    }

    // =========================================================
    // config

    bool apply_bme680_config(const bme680::Config& cfg) {
        if (!bme680.apply_config(cfg)) return false;
        return true;
    }

    bool apply_bh1750_config(const bh1750::Config& cfg) {
        if (!bh1750.apply_config(cfg)) return false;
        storage::save_bh1750_config(cfg);
        return true;
    }

    bool apply_ds18b20_soil_config(const ds18b20::Config& cfg) {
        if (!ds_soil.apply_config(cfg)) return false;
        storage::save_ds18b20_config("ds18b20_soil", cfg);
        return true;
    }

    bool apply_ds18b20_air_config(const ds18b20::Config& cfg) {
        if (!ds_air.apply_config(cfg)) return false;
        storage::save_ds18b20_config("ds18b20_air", cfg);
        return true;
    }

    bool apply_mhz19b_config(const mhz19b::Config& cfg) {
        if (!mhz19b.apply_config(cfg)) return false;
        storage::save_mhz19b_config(cfg);
        return true;
    }

    bool apply_soil_ec_rs485_config(const soil_ec_rs485::Config& cfg) {
        if (!soil_ec.apply_config(cfg)) return false;
        storage::save_soil_ec_rs485_config(cfg);
        return true;
    }

}