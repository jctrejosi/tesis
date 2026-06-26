#include "sensors/mhz19b/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;

    bool save_mhz19b_config(const mhz19b::Config& cfg) {
        if (!prefs.begin("mhz19b", false)) {
            Serial.println("[MHZ19B] no se pudo abrir NVS para escritura");
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);
        prefs.putBool("abc", cfg.auto_calibration);

        prefs.end();
        return true;
    }

    mhz19b::Config load_mhz19b_config() {
        mhz19b::Config cfg = mhz19b::get_default_config();

        if (!prefs.begin("mhz19b", false)) {
            Serial.println("[MHZ19B] no se pudo abrir NVS, usando defaults");
            return cfg;
        }

        cfg.interval_ms      = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation       = prefs.getBool("sim", cfg.simulation);
        cfg.auto_calibration = prefs.getBool("abc", cfg.auto_calibration);

        prefs.end();

        // validación obligatoria
        if (!mhz19b::validate_config(cfg)) {
            Serial.println("[MHZ19B] config inválida en NVS, usando defaults");

            cfg = mhz19b::get_default_config();

            // persistir corrección
            save_mhz19b_config(cfg);
        }

        return cfg;
    }

}