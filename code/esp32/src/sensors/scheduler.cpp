#include "sensors/scheduler.h"
#include "sensors/sensor_manager.h"

#include <Arduino.h>

namespace scheduler {

static unsigned long last_global_sync = 0;
static unsigned long global_sync_interval = 60000; // 10 min

void begin() {
    last_global_sync = millis();
}

void update() {
    unsigned long now = millis();

    // individuales
    sensors::update_individual();

    // sincronizado global
    if (now - last_global_sync >= global_sync_interval) {
        last_global_sync = now;
        sensors::update_global_sync();
    }
}

}