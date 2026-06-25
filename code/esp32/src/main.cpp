#include <Arduino.h>

#include "mqtt/client.h"
#include "sensors/scheduler.h"
#include "sensors/sensor_manager.h"
#include "actuators/relay/command_handler.h"

void setup() {
    Serial.begin(115200);

    setup_wifi();
    setup_mqtt();

    sensors::begin();
    sensors::publish_all_now();
    relay::ensure_initialized();
    scheduler::begin();
}

void loop() {
    mqtt_loop();
    scheduler::update();
}