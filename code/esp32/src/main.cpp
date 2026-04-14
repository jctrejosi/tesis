#include <Arduino.h>

#include "mqtt/client.h"
#include "app_config.h"
#include "sensors/sensor_manager.h"

void setup() {
    Serial.begin(115200);

    setup_wifi();
    setup_mqtt();

    sensors::begin();
}

void loop() {
    mqtt_loop();

    sensors::update();
}