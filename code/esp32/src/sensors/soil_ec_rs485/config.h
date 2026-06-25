#pragma once

#include <cstdint>
#include <Arduino.h>

namespace soil_ec_rs485 {

    struct Config {
        uint32_t interval_ms = 5000;
        bool simulation = false;

         // --- Parámetros Modbus configurables ---
        uint8_t  modbus_slave_id      = 1;
        uint8_t  modbus_function      = 0x03;   // 0x03 = holding, 0x04 = input
        uint16_t modbus_ec_register   = 0x0000; // dirección del registro de EC
        uint16_t modbus_temp_register = 0x0001; // dirección del registro de temperatura
        uint8_t  modbus_reg_count     = 2;      // cantidad de registros a leer (normalmente 2)
        float    ec_scale_factor      = 100.0f; // división para convertir entero → mS/cm
        float    temp_scale_factor    = 10.0f;  // división para convertir entero → °C
        bool     read_temperature     = true;   // si el sensor entrega temperatura

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