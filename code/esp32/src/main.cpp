#include <Arduino.h>

#include "mqtt_client.h"
#include "app_config.h"

#include "bme680_driver.h"
#include "bme680_publisher.h"

BME680Driver bme680_driver;

unsigned long last_bme680_sample = 0;
const unsigned long bme680_interval = 5000;

void setup_sensors() {
    bme680_driver.set_simulation_mode(true);

    if (!bme680_driver.begin()) {
        Serial.println("Error inicializando BME680");
    }
}

void setup() {
    Serial.begin(115200);

    setup_sensors();
    setup_wifi();
    setup_mqtt();
}

void loop() {
    mqtt_loop();

    unsigned long now = millis();

    if (now - last_bme680_sample >= bme680_interval) {
        last_bme680_sample = now;
        publish_bme680_data(bme680_driver);
    }
}