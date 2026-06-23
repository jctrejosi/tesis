#include "device_config.h"
#include <Preferences.h>

uint32_t get_device_id() {
    Preferences prefs;
    prefs.begin("device", true);
    uint32_t id = prefs.getUInt("id", 1);  // valor por defecto 1
    prefs.end();
    return id;
}