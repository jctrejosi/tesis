#include "actuators/relay/config_store.h"

#include <Preferences.h>
#include <Arduino.h>

namespace storage {

    static Preferences prefs;

    bool save_relay_config(const relay::RelayConfig& cfg) {

        if (!prefs.begin("relay", false)) {
            Serial.println("[RELAY] no se pudo abrir NVS (write)");
            return false;
        }

        prefs.putUChar("pin1", cfg.pin_in1);
        prefs.putUChar("pin2", cfg.pin_in2);
        prefs.putUChar("pin3", cfg.pin_in3);
        prefs.putUChar("pin4", cfg.pin_in4);

        prefs.putBool("inv", cfg.inverted);
        prefs.putBool("sim", cfg.simulation);

        prefs.putULong("int", cfg.interval_ms);
        prefs.putULong("pub_int", cfg.publish_interval_ms);

        prefs.end();

        return true;
    }

    relay::RelayConfig load_relay_config() {

        relay::RelayConfig cfg = relay::get_default_config();

        if (!prefs.begin("relay", true)) {
            Serial.println("[RELAY] NVS no disponible, usando defaults");
            return cfg;
        }

        cfg.pin_in1 = prefs.getUChar("pin1", cfg.pin_in1);
        cfg.pin_in2 = prefs.getUChar("pin2", cfg.pin_in2);
        cfg.pin_in3 = prefs.getUChar("pin3", cfg.pin_in3);
        cfg.pin_in4 = prefs.getUChar("pin4", cfg.pin_in4);

        cfg.inverted   = prefs.getBool("inv", cfg.inverted);
        cfg.simulation = prefs.getBool("sim", cfg.simulation);

        cfg.interval_ms = prefs.getULong("int", cfg.interval_ms);
        cfg.publish_interval_ms = prefs.getULong("pub_int", cfg.publish_interval_ms);

        prefs.end();

        // validación obligatoria
        if (!relay::validate_config(cfg)) {
            Serial.println("[RELAY] config inválida en NVS, usando defaults");

            cfg = relay::get_default_config();

            save_relay_config(cfg);
        }

        return cfg;
    }

}