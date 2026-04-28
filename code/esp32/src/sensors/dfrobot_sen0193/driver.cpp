#include "sensors/dfrobot_sen0193/driver.h"

namespace dfrobot_sen0193 {

    DFRobotSEN0193Driver::DFRobotSEN0193Driver()
        : adc_pin(35),
          simulation_mode(false),
          dry_value(3200),
          wet_value(1400),
          last_filtered(0) {}

    bool DFRobotSEN0193Driver::begin() {

        if (simulation_mode) return true;

        pinMode(adc_pin, INPUT);

        // primera lectura para estabilizar ADC
        read_raw();
        delay(50);

        return true;
    }

    uint32_t DFRobotSEN0193Driver::read_raw() {

        if (simulation_mode) {
            return random(wet_value, dry_value);
        }

        // promedio simple para reducir ruido
        uint32_t sum = 0;

        for (int i = 0; i < 10; i++) {
            sum += analogRead(adc_pin);
            delay(2);
        }

        last_filtered = sum / 10;
        return last_filtered;
    }

    float DFRobotSEN0193Driver::map_to_percent(uint16_t raw) {

        // protección contra división inválida
        if (dry_value == wet_value) return 0.0f;

        float percent = 100.0f * (dry_value - raw) / (float)(dry_value - wet_value);

        // clamp
        if (percent < 0.0f) percent = 0.0f;
        if (percent > 100.0f) percent = 100.0f;

        return percent;
    }

    SoilMoistureData DFRobotSEN0193Driver::read() {

        SoilMoistureData data{};

        uint16_t raw = read_raw();

        data.raw_adc = raw;
        data.moisture_percent = map_to_percent(raw);

        return data;
    }

    void DFRobotSEN0193Driver::set_simulation_mode(bool enabled) {
        simulation_mode = enabled;
    }

    void DFRobotSEN0193Driver::set_calibration(uint16_t dry, uint16_t wet) {
        dry_value = dry;
        wet_value = wet;
    }

    void DFRobotSEN0193Driver::set_pin(uint8_t pin) {
        adc_pin = pin;
    }

}