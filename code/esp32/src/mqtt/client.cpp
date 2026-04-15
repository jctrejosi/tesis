#include "client.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include "app_config.h"
#include "sensors/bme680/command_handler.h"

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
    if (!wifi_connected) return false;
    if (client.connected()) return true;

    client.subscribe("growbox/bme680/read");
    client.subscribe("growbox/bme680/config");

    if (millis() - last_mqtt_attempt < retry_interval) {
        return false;
    }

    last_mqtt_attempt = millis();

    Serial.println("Connecting to MQTT...");

    if (client.connect("ESP32GrowBox")) {
        Serial.println("MQTT connected");
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

    memcpy(message, payload, length);
    message[length] = '\0';

    Serial.print("MQTT recibido: ");
    Serial.println(topic);

    if (strcmp(topic, "growbox/bme680/read") == 0) {
        bme680::handle_read_command();
    }

    else if (strcmp(topic, "growbox/bme680/config") == 0) {
        bme680::handle_config_command(message);
    }
}