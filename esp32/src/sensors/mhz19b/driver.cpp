#include "sensors/mhz19b/driver.h"

#include <Arduino.h>
#include <math.h>

#define MHZ19B_RX_PIN 16
#define MHZ19B_TX_PIN 17
#define MHZ19B_BAUD   9600

namespace mhz19b {

    static HardwareSerial co2_serial(1);

    MHZ19BDriver::MHZ19BDriver()
        : simulation_mode(false),
          hardware_ready(false),
          current_config(get_default_config()),
          serial(nullptr) {}

    bool MHZ19BDriver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            hardware_ready = false;
            return true;
        }

        serial = &co2_serial;
        serial->begin(MHZ19B_BAUD, SERIAL_8N1, MHZ19B_RX_PIN, MHZ19B_TX_PIN);

        delay(100); // tiempo para estabilizar UART

        uint8_t response[9];
        if (!send_read_command() || !read_response(response, 9)) {
            Serial.println("[MHZ19B] no responde, activando simulación");
            simulation_mode = true;
            current_config.simulation = true;
            hardware_ready = false;
            return true;
        }

        hardware_ready = true;

        apply_hardware_config();

        Serial.println("[MHZ19B] inicializado");
        return true;
    }

    void MHZ19BDriver::set_simulation_mode(bool enabled) {
        if (enabled == simulation_mode) return;
        simulation_mode = enabled;
        current_config.simulation = enabled;

        if (enabled) {
            if (serial) {
                serial->end();
                serial = nullptr;
                hardware_ready = false;
            }
        } else {
            serial = &co2_serial;
            serial->begin(MHZ19B_BAUD, SERIAL_8N1, MHZ19B_RX_PIN, MHZ19B_TX_PIN);
            hardware_ready = true;  // asumimos éxito
            apply_hardware_config();
        }
    }

    bool MHZ19BDriver::apply_config(const Config& cfg) {
        if (!validate_config(cfg)) {
            Serial.println("[MHZ19B] config inválida");
            return false;
        }

        current_config = cfg;
        simulation_mode = cfg.simulation;

        if (hardware_ready && !simulation_mode) {
            apply_hardware_config();
        }

        return true;
    }

    Config MHZ19BDriver::get_config() const {
        return current_config;
    }

    MHZ19BData MHZ19BDriver::read() {
        MHZ19BData data{};
        data.co2_ppm = -1;

        if (simulation_mode) {
            data.co2_ppm = random(400, 1500); // típico indoor
            return data;
        }

        if (!hardware_ready || serial == nullptr) {
            return data;
        }

        if (!send_read_command()) {
            Serial.println("[MHZ19B] error enviando comando");
            return data;
        }

        uint8_t response[9];

        if (!read_response(response, 9)) {
            Serial.println("[MHZ19B] error leyendo respuesta");
            return data;
        }

        // validar header
        if (response[0] != 0xFF || response[1] != 0x86) {
            Serial.println("[MHZ19B] header inválido");
            return data;
        }

        // validar checksum
        uint8_t checksum = calculate_checksum(response);
        if (checksum != response[8]) {
            Serial.println("[MHZ19B] checksum inválido");
            return data;
        }

        int ppm = (response[2] << 8) | response[3];

        // validación rango real
        if (ppm < 0 || ppm > 5000) {
            Serial.println("[MHZ19B] valor fuera de rango");
            return data;
        }

        data.co2_ppm = ppm;
        return data;
    }

    bool MHZ19BDriver::is_ready() const {
        return hardware_ready;
    }

    // ===== internos =====

    bool MHZ19BDriver::send_read_command() {
        if (!serial) return false;

        uint8_t cmd[9] = {
            0xFF, 0x01, 0x86,
            0x00, 0x00, 0x00,
            0x00, 0x00, 0x00
        };

        cmd[8] = calculate_checksum(cmd);

        serial->write(cmd, 9);
        serial->flush();

        return true;
    }

    bool MHZ19BDriver::read_response(uint8_t* buffer, size_t len) {
        if (!serial) return false;

        unsigned long start = millis();

        size_t index = 0;

        while (index < len) {
            if (serial->available()) {
                buffer[index++] = serial->read();
            }

            if (millis() - start > 200) { // timeout
                return false;
            }
        }

        return true;
    }

    uint8_t MHZ19BDriver::calculate_checksum(uint8_t* packet) {
        uint8_t sum = 0;

        for (int i = 1; i < 8; i++) {
            sum += packet[i];
        }

        return 0xFF - sum + 1;
    }

    void MHZ19BDriver::apply_hardware_config() {
        if (!serial) return;

        // configurar auto calibration (ABC)
        uint8_t cmd[9] = {
            0xFF, 0x01, 0x79,
            static_cast<uint8_t>(current_config.auto_calibration ? 0xA0 : 0x00),
            0x00, 0x00, 0x00, 0x00, 0x00
        };

        cmd[8] = calculate_checksum(cmd);

        serial->write(cmd, 9);
        serial->flush();

        delay(50);
    }

}