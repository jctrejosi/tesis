#include "sensors/as7341/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;

    bool save_as7341_config(const as7341::Config& cfg) {
        if (!prefs.begin("as7341", false)) {
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);
        prefs.putUChar("atime", cfg.atime);
        prefs.putUShort("astep", cfg.astep);
        prefs.putUShort("gain", cfg.gain);
        prefs.putBool("led_en", cfg.led_enabled);
        prefs.putUShort("led_ma", cfg.led_current_ma);

        prefs.end();
        return true;
    }

    as7341::Config load_as7341_config() {
        as7341::Config cfg = as7341::get_default_config();

        if (!prefs.begin("as7341", true)) {
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation = prefs.getBool("sim", cfg.simulation);
        cfg.atime = prefs.getUChar("atime", cfg.atime);
        cfg.astep = prefs.getUShort("astep", cfg.astep);
        cfg.gain = prefs.getUShort("gain", cfg.gain);
        cfg.led_enabled = prefs.getBool("led_en", cfg.led_enabled);
        cfg.led_current_ma = prefs.getUShort("led_ma", cfg.led_current_ma);

        prefs.end();

        if (!as7341::validate_config(cfg)) {
            Serial.println("[AS7341] config inválida en NVS, usando defaults");
            cfg = as7341::get_default_config();
            save_as7341_config(cfg);
        }

        return cfg;
    }

}