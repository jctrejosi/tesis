#include <Arduino.h>

#include "mqtt_client.h"
#include "config.h"

#include "bme680_driver.h"
#include "bme680_publisher.h"

/*
|--------------------------------------------------------------------------
| instancias de drivers
|--------------------------------------------------------------------------
*/
BME680Driver bme680_driver;

/*
|--------------------------------------------------------------------------
| setup sensores
|--------------------------------------------------------------------------
*/
void setup_sensors() {
    bme680_driver.set_simulation_mode(true);

    if (!bme680_driver.begin()) {
        Serial.println("Error inicializando BME680");
    }
}

/*
|--------------------------------------------------------------------------
| setup principal
|--------------------------------------------------------------------------
*/
void setup() {
    Serial.begin(115200);

    setup_sensors();

    setup_wifi();
    setup_mqtt();
}

/*
|--------------------------------------------------------------------------
| loop principal
|--------------------------------------------------------------------------
*/
void loop() {
    mqtt_loop();

    publish_bme680_data(bme680_driver);

    delay(5000);
}