#include <Arduino.h>

#include "mqtt/client.h"
#include "sensors/scheduler.h"
#include "sensors/sensor_manager.h"

void setup() {
    Serial.begin(115200);

    setup_wifi();
    setup_mqtt();

    sensors::begin();
    scheduler::begin();
}

void loop() {
    mqtt_loop();
    scheduler::update();
}