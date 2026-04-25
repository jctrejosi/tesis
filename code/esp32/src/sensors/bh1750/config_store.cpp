#include "sensors/bh1750/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;

    bool save_bh1750_config(const bh1750::Config& cfg) {
        if (!prefs.begin("bh1750", false)) {
            Serial.println("[BH1750] no se pudo abrir NVS para escritura");
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);

        prefs.end();
        return true;
    }

    bh1750::Config load_bh1750_config() {
        bh1750::Config cfg = bh1750::get_default_config();

        if (!prefs.begin("bh1750", true)) {
            Serial.println("[BH1750] no se pudo abrir NVS, usando defaults");
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation = prefs.getBool("sim", cfg.simulation);

        prefs.end();

        if (!bh1750::validate_config(cfg)) {
            Serial.println("[BH1750] config inválida en NVS, usando defaults");
            cfg = bh1750::get_default_config();
            save_bh1750_config(cfg);
        }

        return cfg;
    }

}