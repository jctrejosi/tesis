#include <Arduino.h>
#include <esp_task_wdt.h> 

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

    esp_task_wdt_init(10, true);
    esp_task_wdt_add(NULL);
}

void loop() {
    esp_task_wdt_reset();

    mqtt_loop();
    scheduler::update();
}