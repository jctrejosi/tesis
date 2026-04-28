#include "sensors/soil_ec_rs485/driver.h"

#include <math.h>

namespace soil_ec_rs485 {

    SoilECDriver::SoilECDriver()
        : simulation_mode(false),
          hardware_ready(false),
          serial(nullptr) {}

    bool SoilECDriver::begin() {

        if (simulation_mode) {
            hardware_ready = false;
            return true;
        }

        serial = new HardwareSerial(current_config.uart_port);

        serial->begin(
            current_config.baudrate,
            SERIAL_8N1,
            current_config.rx_pin,
            current_config.tx_pin
        );

        delay(300);
        clear_serial();

        hardware_ready = true;

        Serial.println("[SOIL_EC_RS485] iniciado");

        return true;
    }

    void SoilECDriver::set_simulation_mode(bool enabled) {
        simulation_mode = enabled;
        current_config.simulation = enabled;
    }

    bool SoilECDriver::apply_config(const Config& cfg) {

        if (!validate_config(cfg)) {
            Serial.println("[SOIL_EC_RS485] config inválida");
            return false;
        }

        current_config = cfg;
        simulation_mode = cfg.simulation;

        return true;
    }

    Config SoilECDriver::get_config() const {
        return current_config;
    }

    void SoilECDriver::clear_serial() {
        if (!serial) return;

        while (serial->available()) {
            serial->read();
        }
    }

    bool SoilECDriver::send_request() {

        if (!serial) return false;

        // comando genérico (depende del fabricante)
        uint8_t request[3] = {0x01, 0x03, 0x00};

        serial->write(request, sizeof(request));

        return true;
    }

    bool SoilECDriver::read_response(uint8_t* buffer, size_t len) {

        unsigned long start = millis();

        size_t index = 0;

        while ((millis() - start) < current_config.response_timeout_ms) {

            if (serial->available()) {
                buffer[index++] = serial->read();

                if (index >= len) {
                    return true;
                }
            }
        }

        return false;
    }

    SoilECData SoilECDriver::read() {

        SoilECData data{};
        data.ec_raw = NAN;
        data.temperature = NAN;

        if (simulation_mode) {
            data.ec_raw = random(50, 250) / 100.0f;
            data.temperature = random(180, 300) / 10.0f;
            return data;
        }

        if (!hardware_ready || !serial) {
            return data;
        }

        for (uint8_t attempt = 0; attempt < current_config.retries; attempt++) {

            clear_serial();

            if (!send_request()) {
                continue;
            }

            delay(100);

            uint8_t buffer[8];

            if (!read_response(buffer, sizeof(buffer))) {
                continue;
            }

            // parsing genérico (AJUSTAR según sensor real)
            uint16_t ec_raw_int = (buffer[2] << 8) | buffer[3];
            uint16_t temp_int   = (buffer[4] << 8) | buffer[5];

            data.ec_raw = ec_raw_int / 100.0f;
            data.temperature = temp_int / 10.0f;

            // validación básica
            if (data.ec_raw < 0 || data.ec_raw > 20) {
                data.ec_raw = NAN;
            }

            if (data.temperature < -40 || data.temperature > 85) {
                data.temperature = NAN;
            }

            return data;
        }

        Serial.println("[SOIL_EC_RS485] fallo en lectura");

        return data;
    }

    bool SoilECDriver::is_ready() const {
        return hardware_ready;
    }

}