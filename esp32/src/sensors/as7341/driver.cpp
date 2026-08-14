#include "sensors/as7341/driver.h"

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_AS7341.h>

#define AS7341_SDA_PIN 21
#define AS7341_SCL_PIN 22

namespace as7341 {

    static Adafruit_AS7341 sensor;

    AS7341Driver::AS7341Driver()
        : simulation_mode(false),
          hardware_ready(false),
          current_config(get_default_config()) {
    }

    uint8_t AS7341Driver::map_gain(uint16_t gain) {

        switch (gain) {

            case 1:
                return AS7341_GAIN_0_5X;

            case 2:
                return AS7341_GAIN_1X;

            case 4:
                return AS7341_GAIN_2X;

            case 8:
                return AS7341_GAIN_4X;

            case 16:
                return AS7341_GAIN_8X;

            case 32:
                return AS7341_GAIN_16X;

            case 64:
                return AS7341_GAIN_32X;

            case 128:
                return AS7341_GAIN_64X;

            case 256:
                return AS7341_GAIN_128X;

            case 512:
                return AS7341_GAIN_256X;

            default:
                return AS7341_GAIN_64X;
        }
    }

    void AS7341Driver::apply_hardware_config() {

        if (!hardware_ready || simulation_mode) {
            return;
        }

        sensor.setATIME(current_config.atime);

        sensor.setASTEP(current_config.astep);

        sensor.setGain(
            (as7341_gain_t) map_gain(current_config.gain)
        );

        if (current_config.led_enabled) {

            sensor.enableLED(true);

            sensor.setLEDCurrent(
                current_config.led_current_ma
            );
        }
        else {

            sensor.enableLED(false);
        }
    }

    bool AS7341Driver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            hardware_ready = false;
            return true;
        }

        // NO llamar a Wire.begin() - ya está inicializado globalmente

        if (!sensor.begin()) {
            Serial.println("[AS7341] sensor no detectado, activando simulación");
            simulation_mode = true;
            current_config.simulation = true;
            hardware_ready = false;
            return true;
        }

        hardware_ready = true;
        apply_hardware_config();

        Serial.println("[AS7341] inicializado");
        return true;
    }

    void AS7341Driver::set_simulation_mode(bool enabled) {
        if (enabled == simulation_mode) return;
        simulation_mode = enabled;
        current_config.simulation = enabled;

        if (enabled) {
            // Al entrar en simulación, marcamos hardware como no listo
            // pero NO tocamos Wire (el bus sigue activo para otros sensores)
            hardware_ready = false;
        } else {
            // Al salir de simulación, el bus I2C ya está inicializado globalmente
            // Solo verificamos que el sensor responde y aplicamos configuración
            if (sensor.begin()) {
                hardware_ready = true;
                apply_hardware_config();
            } else {
                Serial.println("[AS7341] sensor no responde al salir de simulación");
                hardware_ready = false;
            }
        }
    }

    bool AS7341Driver::apply_config(
        const Config& cfg
    ) {

        if (!validate_config(cfg)) {

            Serial.println(
                "[AS7341] config inválida"
            );

            return false;
        }

        current_config = cfg;

        simulation_mode = cfg.simulation;

        if (hardware_ready &&
            !simulation_mode) {

            apply_hardware_config();
        }

        return true;
    }

    Config AS7341Driver::get_config() const {

        return current_config;
    }

    AS7341Data AS7341Driver::read() {

        AS7341Data data{};

        if (simulation_mode) {

            data.f1_415nm = random(100, 5000);
            data.f2_445nm = random(100, 5000);
            data.f3_480nm = random(100, 5000);
            data.f4_515nm = random(100, 5000);
            data.f5_555nm = random(100, 5000);

            data.f6_590nm = random(100, 5000);
            data.f7_630nm = random(100, 5000);
            data.f8_680nm = random(100, 5000);

            data.clear = random(1000, 15000);
            data.nir = random(100, 5000);

            return data;
        }

        if (!hardware_ready) {

            return data;
        }

        if (!sensor.readAllChannels()) {

            Serial.println(
                "[AS7341] error de lectura"
            );

            return data;
        }

        data.f1_415nm = sensor.getChannel(
            AS7341_CHANNEL_415nm_F1
        );

        data.f2_445nm = sensor.getChannel(
            AS7341_CHANNEL_445nm_F2
        );

        data.f3_480nm = sensor.getChannel(
            AS7341_CHANNEL_480nm_F3
        );

        data.f4_515nm = sensor.getChannel(
            AS7341_CHANNEL_515nm_F4
        );

        data.f5_555nm = sensor.getChannel(
            AS7341_CHANNEL_555nm_F5
        );

        data.f6_590nm = sensor.getChannel(
            AS7341_CHANNEL_590nm_F6
        );

        data.f7_630nm = sensor.getChannel(
            AS7341_CHANNEL_630nm_F7
        );

        data.f8_680nm = sensor.getChannel(
            AS7341_CHANNEL_680nm_F8
        );

        data.clear = sensor.getChannel(
            AS7341_CHANNEL_CLEAR
        );

        data.nir = sensor.getChannel(
            AS7341_CHANNEL_NIR
        );

        return data;
    }

    bool AS7341Driver::is_ready() const {

        return hardware_ready;
    }

}