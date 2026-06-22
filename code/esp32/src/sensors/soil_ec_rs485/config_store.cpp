#include "sensors/soil_ec_rs485/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;
    static const char* NAMESPACE = "soil_ec";

    bool save_soil_ec_rs485_config(const soil_ec_rs485::Config& cfg) {
        if (!prefs.begin(NAMESPACE, false)) {
            Serial.println("[SOIL_EC_RS485] error abriendo NVS (write)");
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);

        prefs.putUChar("uart", cfg.uart_port);
        prefs.putULong("baud", cfg.baudrate);

        prefs.putChar("rx", cfg.rx_pin);
        prefs.putChar("tx", cfg.tx_pin);
        prefs.putChar("de", cfg.de_pin);
        prefs.putChar("re", cfg.re_pin);

        prefs.putBool("temp_comp", cfg.use_temperature_compensation);

        prefs.putUChar("retries", cfg.retries);
        prefs.putUShort("timeout", cfg.response_timeout_ms);

        prefs.end();
        return true;
    }

    soil_ec_rs485::Config load_soil_ec_rs485_config() {
        soil_ec_rs485::Config cfg = soil_ec_rs485::get_default_config();

        if (!prefs.begin(NAMESPACE, true)) {
            Serial.println("[SOIL_EC_RS485] NVS no disponible, usando defaults");
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation = prefs.getBool("sim", cfg.simulation);

        cfg.uart_port = prefs.getUChar("uart", cfg.uart_port);
        cfg.baudrate = prefs.getULong("baud", cfg.baudrate);

        cfg.rx_pin = prefs.getChar("rx", cfg.rx_pin);
        cfg.tx_pin = prefs.getChar("tx", cfg.tx_pin);
        cfg.de_pin = prefs.getChar("de", cfg.de_pin);
        cfg.re_pin = prefs.getChar("re", cfg.re_pin);

        cfg.use_temperature_compensation =
            prefs.getBool("temp_comp", cfg.use_temperature_compensation);

        cfg.retries = prefs.getUChar("retries", cfg.retries);
        cfg.response_timeout_ms = prefs.getUShort("timeout", cfg.response_timeout_ms);

        prefs.end();

        if (!soil_ec_rs485::validate_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] config inválida en NVS -> reset defaults");
            cfg = soil_ec_rs485::get_default_config();
            save_soil_ec_rs485_config(cfg);
        }

        return cfg;
    }

}