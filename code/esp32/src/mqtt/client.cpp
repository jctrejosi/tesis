#include "client.h"

#include <WiFi.h>
#include <PubSubClient.h>
#include <cstring>

#include "app_config.h"
#include "mqtt/router.h"

WiFiClient espClient;
PubSubClient client(espClient);

static unsigned long last_mqtt_attempt = 0;
static const unsigned long retry_interval = 5000;

bool wifi_connected = false;

void setup_wifi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);

        if (millis() - start > 10000) {
            Serial.println("WiFi timeout");
            wifi_connected = false;
            return;
        }
    }

    wifi_connected = true;
    Serial.println("WiFi connected");
}

void setup_mqtt() {
    client.setServer(MQTT_BROKER, MQTT_PORT);
    client.setCallback(mqtt_callback);
}

bool reconnect_mqtt() {
    if (!wifi_connected) {
        return false;
    }

    if (client.connected()) {
        return true;
    }

    if (millis() - last_mqtt_attempt < retry_interval) {
        return false;
    }

    last_mqtt_attempt = millis();

    Serial.println("Connecting to MQTT...");

    if (client.connect("ESP32GrowBox")) {
        Serial.println("MQTT connected");
        client.subscribe("growbox/#");

        return true;
    }

    Serial.println("MQTT connection failed");
    return false;
}

bool publish_message(const char* topic, const char* payload) {
    if (!reconnect_mqtt()) {
        return false;
    }

    return client.publish(topic, payload);
}

void mqtt_loop() {
    if (WiFi.status() != WL_CONNECTED) {
        wifi_connected = false;
        setup_wifi();
        return;
    }

    wifi_connected = true;

    if (!client.connected()) {
        reconnect_mqtt();
    }

    client.loop();
}

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    char message[256];

    size_t n = length;
    if (n >= sizeof(message)) {
        n = sizeof(message) - 1;
    }

    memcpy(message, payload, n);
    message[n] = '\0';

    Serial.print("MQTT recibido: ");
    Serial.println(topic);

    route_message(topic, message);
}