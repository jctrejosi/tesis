#include "sensors/scheduler.h"
#include "sensors/sensor_manager.h"
#include "actuators/relay/command_handler.h"
#include "actuators/relay/publisher.h"

#include <Arduino.h>

namespace scheduler {

static unsigned long last_global_sync = 0;
static unsigned long global_sync_interval = 300000; // 5 min
static unsigned long last_relay_publish = 0;

void begin() {
    last_global_sync = millis();
    last_relay_publish = millis();
}

void update() {
    unsigned long now = millis();

    // individuales
    sensors::update_individual();

    // Publicación periódica del estado del relé
    relay::Sensor& relay_sensor = relay::get_relay_sensor();
    uint32_t relay_interval = relay_sensor.get_config().publish_interval_ms;

    if (relay_interval > 0 && (now - last_relay_publish >= relay_interval)) {
        last_relay_publish = now;
        relay::Publisher::publish_all_state(relay_sensor);
    }

    // sincronizado global
    if (now - last_global_sync >= global_sync_interval) {
        last_global_sync = now;
        sensors::update_global_sync();
    }

}