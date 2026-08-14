#include "sensors/soil_ec_rs485/config.h"

namespace soil_ec_rs485 {

    Config get_default_config() {
        Config cfg;
        cfg.interval_ms = 25000;
        cfg.simulation = false;

        cfg.uart_port = 2;
        cfg.baudrate = 9600;

        cfg.rx_pin = 18;
        cfg.tx_pin = 19;
        cfg.de_pin = 14;
        cfg.re_pin = 14;

        cfg.use_temperature_compensation = true;
        cfg.retries = 2;
        cfg.response_timeout_ms = 150;

        // Valores Modbus por defecto (placeholder genérico)
        cfg.modbus_slave_id      = 1;
        cfg.modbus_function      = 0x03;
        cfg.modbus_ec_register   = 0x0000;
        cfg.modbus_temp_register = 0x0001;
        cfg.modbus_reg_count     = 2;
        cfg.ec_scale_factor      = 100.0f;
        cfg.temp_scale_factor    = 10.0f;
        cfg.read_temperature     = true;

        return cfg;
    }

    bool validate_config(const Config& cfg) {
        if (cfg.interval_ms < 1000 || cfg.interval_ms > 600000) return false;
        if (cfg.uart_port > 2) return false;
        if (cfg.baudrate < 1200 || cfg.baudrate > 115200) return false;
        if (cfg.rx_pin < -1 || cfg.rx_pin > 39) return false;
        if (cfg.tx_pin < -1 || cfg.tx_pin > 39) return false;
        if (cfg.de_pin < -1 || cfg.de_pin > 39) return false;
        if (cfg.re_pin < -1 || cfg.re_pin > 39) return false;
        if (cfg.retries == 0 || cfg.retries > 10) return false;
        if (cfg.response_timeout_ms < 50 || cfg.response_timeout_ms > 2000) return false;

        // Validaciones Modbus
        if (cfg.modbus_slave_id < 1 || cfg.modbus_slave_id > 247) return false;
        if (cfg.modbus_function != 0x03 && cfg.modbus_function != 0x04) return false;
        // No hay restricciones fuertes para los registros, solo que no sean absurdos
        if (cfg.modbus_ec_register > 0xFFFF) return false;
        if (cfg.modbus_temp_register > 0xFFFF) return false;
        if (cfg.modbus_reg_count < 1 || cfg.modbus_reg_count > 10) return false;
        if (cfg.ec_scale_factor <= 0.0f || cfg.ec_scale_factor > 10000.0f) return false;
        if (cfg.temp_scale_factor <= 0.0f || cfg.temp_scale_factor > 1000.0f) return false;

        return true;
    }

    void print_config(const Config& cfg) {
        Serial.println("---- SOIL EC RS485 CONFIG ----");

        Serial.print("interval_ms: ");
        Serial.println(cfg.interval_ms);

        Serial.print("simulation: ");
        Serial.println(cfg.simulation);

        Serial.print("uart_port: ");
        Serial.println(cfg.uart_port);

        Serial.print("baudrate: ");
        Serial.println(cfg.baudrate);

        Serial.print("rx_pin: ");
        Serial.println(cfg.rx_pin);

        Serial.print("tx_pin: ");
        Serial.println(cfg.tx_pin);

        Serial.print("de_pin: ");
        Serial.println(cfg.de_pin);

        Serial.print("re_pin: ");
        Serial.println(cfg.re_pin);

        Serial.print("use_temp_comp: ");
        Serial.println(cfg.use_temperature_compensation);

        Serial.print("retries: ");
        Serial.println(cfg.retries);

        Serial.print("timeout_ms: ");
        Serial.println(cfg.response_timeout_ms);

        Serial.println("------------------------------");
    }

}