#include "sensors/bme680/config_store.h"
#include <Preferences.h>

namespace storage {

    Preferences prefs;

    bool save_bme680_config(const bme680::Config& cfg) {
        if (!prefs.begin("bme680", false)) {
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);

        prefs.putUChar("temp_os", cfg.temp_oversample);
        prefs.putUChar("hum_os", cfg.hum_oversample);
        prefs.putUChar("press_os", cfg.press_oversample);

        prefs.putUChar("iir", cfg.iir_filter);

        prefs.putUShort("gas_temp", cfg.gas_heater_temp);
        prefs.putUShort("gas_dur", cfg.gas_heater_duration);

        prefs.end();
        return true;
    }

    bme680::Config load_bme680_config() {
        bme680::Config cfg = bme680::get_default_config();

        if (!prefs.begin("bme680", true)) {
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation = prefs.getBool("sim", cfg.simulation);

        cfg.temp_oversample = prefs.getUChar("temp_os", cfg.temp_oversample);
        cfg.hum_oversample = prefs.getUChar("hum_os", cfg.hum_oversample);
        cfg.press_oversample = prefs.getUChar("press_os", cfg.press_oversample);

        cfg.iir_filter = prefs.getUChar("iir", cfg.iir_filter);

        cfg.gas_heater_temp = prefs.getUShort("gas_temp", cfg.gas_heater_temp);
        cfg.gas_heater_duration = prefs.getUShort("gas_dur", cfg.gas_heater_duration);

        prefs.end();

        if (!bme680::validate_config(cfg)) {
            return bme680::get_default_config();
        }

        return cfg;
    }

}