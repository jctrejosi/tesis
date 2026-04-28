#include "sensors/soil_ec_rs485/config.h"

namespace soil_ec_rs485 {

    Config get_default_config() {
        Config cfg;

        cfg.interval_ms = 5000;
        cfg.simulation = false;

        cfg.uart_port = 2;
        cfg.baudrate = 9600;

        cfg.rx_pin = 16;
        cfg.tx_pin = 17;

        cfg.de_pin = -1;
        cfg.re_pin = -1;

        cfg.use_temperature_compensation = true;

        cfg.retries = 3;
        cfg.response_timeout_ms = 200;

        return cfg;
    }

    bool validate_config(const Config& cfg) {

        if (cfg.interval_ms < 1000) return false;
        if (cfg.interval_ms > 600000) return false;

        if (cfg.baudrate < 1200 || cfg.baudrate > 115200) return false;

        if (cfg.rx_pin < -1 || cfg.rx_pin > 39) return false;
        if (cfg.tx_pin < -1 || cfg.tx_pin > 39) return false;

        if (cfg.retries == 0 || cfg.retries > 10) return false;

        if (cfg.response_timeout_ms < 50 || cfg.response_timeout_ms > 2000) return false;

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

        Serial.print("use_temp_comp: ");
        Serial.println(cfg.use_temperature_compensation);

        Serial.print("retries: ");
        Serial.println(cfg.retries);

        Serial.print("timeout_ms: ");
        Serial.println(cfg.response_timeout_ms);

        Serial.println("------------------------------");
    }

}