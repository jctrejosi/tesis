#include "sensors/ds18b20/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;

    bool save_ds18b20_config(const ds18b20::Config& cfg) {
        if (!prefs.begin("ds18b20", false)) {
            Serial.println("[DS18B20] no se pudo abrir NVS para escritura");
            return false;
        }

        prefs.putULong("interval", cfg.interval_ms);
        prefs.putBool("sim", cfg.simulation);
        prefs.putUChar("res", cfg.resolution);
        prefs.putBool("use_addr", cfg.use_address);

        // guardar address (8 bytes)
        size_t written = prefs.putBytes("addr", cfg.address, 8);
        if (written != 8) {
            Serial.println("[DS18B20] error guardando address");
        }

        prefs.end();
        return true;
    }

    ds18b20::Config load_ds18b20_config() {
        ds18b20::Config cfg = ds18b20::get_default_config();

        if (!prefs.begin("ds18b20", true)) {
            Serial.println("[DS18B20] no se pudo abrir NVS, usando defaults");
            return cfg;
        }

        cfg.interval_ms = prefs.getULong("interval", cfg.interval_ms);
        cfg.simulation  = prefs.getBool("sim", cfg.simulation);
        cfg.resolution  = prefs.getUChar("res", cfg.resolution);
        cfg.use_address = prefs.getBool("use_addr", cfg.use_address);

        // leer address (8 bytes)
        size_t read = prefs.getBytes("addr", cfg.address, 8);
        if (read != 8) {
            // si no existe o está corrupto → limpiar
            for (int i = 0; i < 8; i++) {
                cfg.address[i] = 0;
            }
        }

        prefs.end();

        // validación obligatoria
        if (!ds18b20::validate_config(cfg)) {
            Serial.println("[DS18B20] config inválida en NVS, usando defaults");

            cfg = ds18b20::get_default_config();

            // persistir corrección
            save_ds18b20_config(cfg);
        }

        return cfg;
    }

}