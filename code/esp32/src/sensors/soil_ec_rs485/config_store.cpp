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

        prefs.putUChar("mb_slave", cfg.modbus_slave_id);
        prefs.putUChar("mb_func", cfg.modbus_function);
        prefs.putUShort("mb_ec_reg", cfg.modbus_ec_register);
        prefs.putUShort("mb_temp_reg", cfg.modbus_temp_register);
        prefs.putUChar("mb_reg_cnt", cfg.modbus_reg_count);
        prefs.putFloat("ec_scale", cfg.ec_scale_factor);
        prefs.putFloat("temp_scale", cfg.temp_scale_factor);
        prefs.putBool("read_temp", cfg.read_temperature);

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

        cfg.modbus_slave_id      = prefs.getUChar("mb_slave", cfg.modbus_slave_id);
        cfg.modbus_function      = prefs.getUChar("mb_func", cfg.modbus_function);
        cfg.modbus_ec_register   = prefs.getUShort("mb_ec_reg", cfg.modbus_ec_register);
        cfg.modbus_temp_register = prefs.getUShort("mb_temp_reg", cfg.modbus_temp_register);
        cfg.modbus_reg_count     = prefs.getUChar("mb_reg_cnt", cfg.modbus_reg_count);
        cfg.ec_scale_factor      = prefs.getFloat("ec_scale", cfg.ec_scale_factor);
        cfg.temp_scale_factor    = prefs.getFloat("temp_scale", cfg.temp_scale_factor);
        cfg.read_temperature     = prefs.getBool("read_temp", cfg.read_temperature);

        prefs.end();

        if (!soil_ec_rs485::validate_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] config inválida en NVS -> reset defaults");
            cfg = soil_ec_rs485::get_default_config();
            save_soil_ec_rs485_config(cfg);
        }

        return cfg;
    }

}