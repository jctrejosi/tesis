#include <Preferences.h>
#include <Arduino.h>

#include "sensors/dfrobot_sen0193/config_store.h"

namespace storage {

    static Preferences prefs;

    bool save_dfrobot_sen0193_config(const dfrobot_sen0193::Config& cfg) {

        if (!prefs.begin("sen0193", false)) {
            Serial.println("[SEN0193] no se pudo abrir NVS escritura");
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);

        prefs.putUChar("pin", cfg.adc_pin);

        prefs.putUShort("dry", cfg.dry_value);
        prefs.putUShort("wet", cfg.wet_value);

        prefs.putUChar("samples", cfg.samples);

        prefs.end();

        return true;
    }

    dfrobot_sen0193::Config load_dfrobot_sen0193_config() {

        dfrobot_sen0193::Config cfg = dfrobot_sen0193::get_default_config();

        if (!prefs.begin("sen0193", true)) {
            Serial.println("[SEN0193] NVS no disponible, usando defaults");
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation  = prefs.getBool("sim", cfg.simulation);

        cfg.adc_pin = prefs.getUChar("pin", cfg.adc_pin);

        cfg.dry_value = prefs.getUShort("dry", cfg.dry_value);
        cfg.wet_value = prefs.getUShort("wet", cfg.wet_value);

        cfg.samples = prefs.getUChar("samples", cfg.samples);

        prefs.end();

        // importante: validación de seguridad
        if (!dfrobot_sen0193::validate_config(cfg)) {

            Serial.println("[SEN0193] config inválida en NVS, restaurando defaults");

            cfg = dfrobot_sen0193::get_default_config();

            save_dfrobot_sen0193_config(cfg);
        }

        return cfg;
    }

}