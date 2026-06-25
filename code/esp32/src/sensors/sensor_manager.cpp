#include "sensors/sensor_manager.h"

#include "sensors/bme680/sensor.h"
#include "sensors/bme680/publisher.h"

#include "sensors/as7341/sensor.h"
#include "sensors/as7341/publisher.h"
#include "sensors/as7341/config_store.h"

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
    static as7341::Sensor as7341;
    static mhz19b::Sensor mhz19b;
    static soil_ec_rs485::Sensor soil_ec;

    // ===== timers =====
    static unsigned long last_bme = 0;
    static unsigned long last_bh  = 0;

    static unsigned long last_co2 = 0;
    static unsigned long last_ec  = 0;

    // =========================================================
    void begin() {

        bme680.init();
        as7341.init();
        mhz19b.init();
        soil_ec.init();

        unsigned long now = millis();

        last_bme = now;
        last_bh  = now;
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

        // ===== as7341 =====
        if (now - last_bh >= as7341.get_config().interval_ms) {
            last_bh = now;
            as7341::Publisher::publish(as7341.read());
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
        as7341::Publisher::publish(as7341.read());

        mhz19b::Publisher::publish(mhz19b.read());
        soil_ec_rs485::Publisher::publish(soil_ec.read());
    }

    // =========================================================
    // publish inmediato

    void publish_bme680_now() {
        bme680::Publisher::publish(bme680.read());
    }

    void publish_as7341_now() {
        as7341::Publisher::publish(as7341.read());
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

    bool apply_as7341_config(const as7341::Config& cfg) {
        if (!as7341.apply_config(cfg)) return false;
        storage::save_as7341_config(cfg);
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

    void publish_all_now() {
        publish_bme680_now();
        publish_as7341_now();
        publish_mhz19b_now();
        publish_soil_ec_rs485_now();
    }

    void publish_as7341_config() {
        as7341::Config cfg = as7341.get_config();
        as7341::Publisher::publish_config(cfg);
    }
}