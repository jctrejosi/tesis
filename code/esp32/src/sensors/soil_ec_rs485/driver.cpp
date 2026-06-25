#include "sensors/soil_ec_rs485/driver.h"

#include <math.h>

namespace soil_ec_rs485 {

    static constexpr uint8_t MODBUS_SLAVE_ID = 0x01;
    static constexpr uint8_t MODBUS_FUNC_READ_HOLDING_REGS = 0x03;
    static constexpr uint16_t MODBUS_START_REG = 0x0000;   // placeholder: ajustar al datasheet real
    static constexpr uint16_t MODBUS_REG_COUNT = 0x0002;   // placeholder: 2 registros
    static constexpr size_t MODBUS_RESPONSE_LEN = 9;

    SoilECDriver::SoilECDriver()
        : simulation_mode(false),
          hardware_ready(false),
          current_config(get_default_config()),
          serial(nullptr) {}

    void SoilECDriver::release_serial() {
        if (serial != nullptr) {
            serial->end();
            delete serial;
            serial = nullptr;
        }
    }

    void SoilECDriver::set_transmit_mode() {
        if (current_config.de_pin >= 0) {
            digitalWrite(current_config.de_pin, HIGH);
        }

        if (current_config.re_pin >= 0) {
            digitalWrite(current_config.re_pin, HIGH);
        }
    }

    void SoilECDriver::set_receive_mode() {
        if (current_config.de_pin >= 0) {
            digitalWrite(current_config.de_pin, LOW);
        }

        if (current_config.re_pin >= 0) {
            digitalWrite(current_config.re_pin, LOW);
        }
    }

    bool SoilECDriver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            release_serial();
            hardware_ready = false;
            return true;
        }

        release_serial();
        serial = new HardwareSerial(current_config.uart_port);
        if (serial == nullptr) {
            Serial.println("[SOIL_EC_RS485] no se pudo crear HardwareSerial, activando simulación");
            simulation_mode = true;
            current_config.simulation = true;
            hardware_ready = false;
            return true;
        }

        if (current_config.de_pin >= 0) {
            pinMode(current_config.de_pin, OUTPUT);
        }

        if (current_config.re_pin >= 0) {
            pinMode(current_config.re_pin, OUTPUT);
        }

        set_receive_mode();

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

        const bool hardware_changed =
            current_config.uart_port != cfg.uart_port ||
            current_config.baudrate != cfg.baudrate ||
            current_config.rx_pin != cfg.rx_pin ||
            current_config.tx_pin != cfg.tx_pin ||
            current_config.de_pin != cfg.de_pin ||
            current_config.re_pin != cfg.re_pin;

        const bool simulation_changed = current_config.simulation != cfg.simulation;

        current_config = cfg;
        simulation_mode = cfg.simulation;

        if (simulation_mode) {
            release_serial();
            hardware_ready = false;
            return true;
        }

        if (hardware_ready && (hardware_changed || simulation_changed)) {
            return begin();
        }

        if (!hardware_ready && simulation_changed) {
            return begin();
        }

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

        uint8_t request[8];
        request[0] = current_config.modbus_slave_id;
        request[1] = current_config.modbus_function;
        request[2] = static_cast<uint8_t>(current_config.modbus_ec_register >> 8);
        request[3] = static_cast<uint8_t>(current_config.modbus_ec_register & 0xFF);
        request[4] = static_cast<uint8_t>(current_config.modbus_reg_count >> 8);
        request[5] = static_cast<uint8_t>(current_config.modbus_reg_count & 0xFF);

        uint16_t crc = calculate_crc(request, 6);
        request[6] = static_cast<uint8_t>(crc & 0xFF);
        request[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

        set_transmit_mode();
        serial->write(request, sizeof(request));
        serial->flush();
        delay(2);
        set_receive_mode();
        return true;
    }

    bool SoilECDriver::read_response(uint8_t* buffer, size_t len) {
        if (!serial || buffer == nullptr || len == 0) return false;

        unsigned long start = millis();
        size_t index = 0;

        while ((millis() - start) < current_config.response_timeout_ms) {
            while (serial->available() && index < len) {
                buffer[index++] = static_cast<uint8_t>(serial->read());
            }

            if (index >= len) {
                return true;
            }

            delay(1);
        }

        return false;
    }

    uint16_t SoilECDriver::calculate_crc(const uint8_t* data, size_t len) const {
        uint16_t crc = 0xFFFF;

        for (size_t i = 0; i < len; ++i) {
            crc ^= data[i];

            for (uint8_t j = 0; j < 8; ++j) {
                if (crc & 0x0001) {
                    crc >>= 1;
                    crc ^= 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }

        return crc;
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

        if (!hardware_ready || !serial) return data;

        for (uint8_t attempt = 0; attempt < current_config.retries; attempt++) {
            clear_serial();
            if (!send_request()) continue;

            // Tamaño de respuesta: slave(1) + func(1) + byte_count(1) + datos(2*reg_count) + CRC(2)
            size_t response_len = 3 + 2 * current_config.modbus_reg_count + 2;
            uint8_t buffer[response_len];
            memset(buffer, 0, response_len);

            if (!read_response(buffer, response_len)) continue;

            // Verificar slave id y función
            if (buffer[0] != current_config.modbus_slave_id ||
                buffer[1] != current_config.modbus_function) continue;

            uint8_t byte_count = buffer[2];
            if (byte_count != 2 * current_config.modbus_reg_count) continue;

            // Verificar CRC
            uint16_t received_crc = buffer[response_len - 2] | (buffer[response_len - 1] << 8);
            uint16_t calculated_crc = calculate_crc(buffer, response_len - 2);
            if (received_crc != calculated_crc) {
                Serial.println("[SOIL_EC_RS485] CRC inválido");
                continue;
            }

            // Parsear EC (primer registro)
            uint16_t ec_raw_int = (buffer[3] << 8) | buffer[4];
            data.ec_raw = ec_raw_int / current_config.ec_scale_factor;

            // Parsear temperatura si está habilitada y hay al menos 2 registros
            if (current_config.read_temperature && current_config.modbus_reg_count >= 2) {
                uint16_t temp_int = (buffer[5] << 8) | buffer[6];
                data.temperature = temp_int / current_config.temp_scale_factor;
            }

            // Validación de rangos
            if (data.ec_raw < 0.0f || data.ec_raw > 23.0f) data.ec_raw = NAN;
            if (data.temperature < -40.0f || data.temperature > 85.0f) data.temperature = NAN;

            return data;
        }

        Serial.println("[SOIL_EC_RS485] fallo en lectura");
        return data;
    }

    bool SoilECDriver::is_ready() const {
        return hardware_ready;
    }

}