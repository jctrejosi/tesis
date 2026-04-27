#include "sensors/bh1750/driver.h"

#include <Wire.h>
#include <BH1750.h>
#include <math.h>

#define BH1750_I2C_ADDRESS 0x23
#define BH1750_SDA_PIN 21
#define BH1750_SCL_PIN 22

namespace bh1750 {

    static BH1750 light_meter;

    BH1750Driver::BH1750Driver()
        : simulation_mode(false),
          hardware_ready(false),
          current_config(get_default_config()) {}

    bool BH1750Driver::begin() {
        randomSeed(millis());

        if (simulation_mode) {
            hardware_ready = false;
            return true;
        }

        Wire.begin(BH1750_SDA_PIN, BH1750_SCL_PIN);

        if (!light_meter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_I2C_ADDRESS, &Wire)) {
            Serial.println("[BH1750] no detectado");
            hardware_ready = false;
            return false;
        }

        hardware_ready = true;
        Serial.println("[BH1750] inicializado");
        return true;
    }

    void BH1750Driver::set_simulation_mode(bool enabled) {
        simulation_mode = enabled;
        current_config.simulation = enabled;
    }

    bool BH1750Driver::apply_config(const Config& cfg) {
        if (!validate_config(cfg)) {
            Serial.println("[BH1750] config inválida");
            return false;
        }

        current_config = cfg;
        simulation_mode = cfg.simulation;
        return true;
    }

    Config BH1750Driver::get_config() const {
        return current_config;
    }

    BH1750Data BH1750Driver::read() {
        BH1750Data data{};
        data.illuminance = NAN;

        if (simulation_mode) {
            data.illuminance = (float)random(100, 10000);
            return data;
        }

        if (!hardware_ready) {
            return data;
        }

        float lux = light_meter.readLightLevel();

        if (isnan(lux) || lux < 0) {
            Serial.println("[BH1750] error lectura");
            return data;
        }

        data.illuminance = lux;
        return data;
    }
}