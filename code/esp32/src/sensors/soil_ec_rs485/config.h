#pragma once

#include <cstdint>
#include <Arduino.h>

namespace soil_ec_rs485 {

    struct Config {
        uint32_t interval_ms = 5000;
        bool simulation = false;

        // UART / RS485
        uint8_t uart_port = 2;
        uint32_t baudrate = 9600;

        // pines RS485 (ESP32 típico)
        int8_t rx_pin = 16;
        int8_t tx_pin = 17;
        int8_t de_pin = -1;   // opcional control DE
        int8_t re_pin = -1;   // opcional control RE

        // lógica del sensor
        bool use_temperature_compensation = true;

        // estabilidad de lectura
        uint8_t retries = 3;
        uint16_t response_timeout_ms = 200;
    };

    Config get_default_config();
    bool validate_config(const Config& cfg);
    void print_config(const Config& cfg);

}