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
            Serial.println("WiFi connection timeout");
            return;
        }
    }

    Serial.println("WiFi connected");
}

void setup_mqtt() {
    client.setServer(MQTT_BROKER, MQTT_PORT);
}

bool reconnect_mqtt() {
    if (client.connected()) return true;

    Serial.println("Connecting to MQTT...");

    bool ok = client.connect("ESP32GrowBox");

    if (!ok) {
        Serial.println("MQTT connection failed");
        return false;
    }

    Serial.println("MQTT connected");
    return true;
}

bool publish_message(const char* topic, const char* payload) {
    if (!client.connected()) {
        if (!reconnect_mqtt()) {
            return false;
        }
    }

    bool ok = client.publish(topic, payload);

    if (!ok) {
        Serial.println("Publish failed");
    }

    return ok;
}

void mqtt_loop() {
    if (!client.connected()) {
        reconnect_mqtt();
    }

    client.loop();
}