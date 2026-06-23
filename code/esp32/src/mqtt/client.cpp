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
    // Configuración más robusta
    WiFi.mode(WIFI_STA);
    WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE); // Para evitar IP estática
    
    // Intenta conectar primero con el SSID exacto
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    Serial.print("Conectando a WiFi... ");
    Serial.println(WIFI_SSID);

    unsigned long start = millis();
    int attempts = 0;
    
    // Aumenta timeout a 20 segundos
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        attempts++;
        Serial.print(".");
        
        if (attempts % 10 == 0) {
            Serial.println();
            Serial.print("Intento ");
            Serial.print(attempts/2);
            Serial.println(" segundos...");

            // Reintenta si pasó mucho tiempo
            if (attempts > 30) {
                WiFi.disconnect();
                WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            }
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifi_connected = true;
        Serial.println();
        Serial.println("WiFi connected");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        wifi_connected = false;
        Serial.println();
        Serial.println("WiFi FAILED - Timeout");
        Serial.print("Estado: ");
        Serial.println(WiFi.status());
        // WL_NO_SHIELD = 255, WL_IDLE_STATUS = 0, WL_NO_SSID_AVAIL = 1, WL_SCAN_COMPLETED = 2, WL_CONNECTED = 3, WL_CONNECT_FAILED = 4, WL_CONNECTION_LOST = 5, WL_DISCONNECTED = 6
    }
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