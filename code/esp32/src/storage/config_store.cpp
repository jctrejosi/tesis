#include "storage/config_store.h"
#include <Preferences.h>

namespace storage {

Preferences prefs;

bool save_bme680_config(const bme680::Config& cfg) {
    prefs.begin("bme680", false);

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
    prefs.begin("bme680", true);

    bme680::Config cfg;

    cfg.interval_ms = prefs.getULong("interval", 10000);
    cfg.simulation = prefs.getBool("sim", false);

    cfg.temp_oversample = prefs.getUChar("temp_os", 8);
    cfg.hum_oversample = prefs.getUChar("hum_os", 2);
    cfg.press_oversample = prefs.getUChar("press_os", 4);

    cfg.iir_filter = prefs.getUChar("iir", 3);

    cfg.gas_heater_temp = prefs.getUShort("gas_temp", 320);
    cfg.gas_heater_duration = prefs.getUShort("gas_dur", 150);

    prefs.end();
    return cfg;
}

}