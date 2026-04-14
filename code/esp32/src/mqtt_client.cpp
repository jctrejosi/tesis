#include "mqtt_client.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include "app_config.h"

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start_attempt = millis();

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);

        if (millis() - start_attempt > 10000) {
            break;
        }
    }
}

void setup_mqtt() {
    client.setServer(MQTT_BROKER, MQTT_PORT);
}

void reconnect_mqtt() {
    while (!client.connected()) {
        client.connect("ESP32GrowBox");
        delay(500);
    }
}

bool publish_message(const char* topic, const char* payload) {
    if (!client.connected()) {
        reconnect_mqtt();
    }

    return client.publish(topic, payload);
}

void mqtt_loop() {
    client.loop();
}