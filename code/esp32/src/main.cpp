#include <Arduino.h>
#include <ArduinoOTA.h>
#include <esp_task_wdt.h> 

#include "mqtt/client.h"
#include "sensors/scheduler.h"
#include "sensors/sensor_manager.h"
#include "actuators/relay/command_handler.h"
#include "app_config.h"

void setup() {
    Serial.begin(115200);

    setup_wifi();
    setup_mqtt();

     // --- OTA ---
    ArduinoOTA.setHostname("ESP32GrowBox");
    ArduinoOTA.setPassword(OTA_PASSWORD);
    ArduinoOTA.onStart([]() {
        Serial.println("[OTA] Inicio de actualización");
    });
    ArduinoOTA.onEnd([]() {
        Serial.println("[OTA] Actualización completa, reiniciando...");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("[OTA] Progreso: %u%%\r", progress / (total / 100));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("[OTA] Error[%u]: ", error);
    });
    ArduinoOTA.begin();
    Serial.println("[OTA] listo");

    sensors::begin();
    scheduler::begin();

    publish_boot_message();

    esp_task_wdt_init(10, true);
    esp_task_wdt_add(NULL);
}

void loop() {
    esp_task_wdt_reset();
    ArduinoOTA.handle();

    mqtt_loop();
    scheduler::update();
}