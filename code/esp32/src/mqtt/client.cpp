#include "client.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <cstring>
#include <time.h>
#include "app_config.h"
#include "router.h"
#include "message_queue.h"

WiFiClient espClient;
PubSubClient client(espClient);

static unsigned long last_mqtt_attempt = 0;
static const unsigned long retry_interval = 5000;
static MessageQueue pending_messages;

bool wifi_connected = false;

void setup_wifi() {
    WiFi.mode(WIFI_STA);
    WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE);

    // Activar reconexión automática no bloqueante
    WiFi.setAutoReconnect(true);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Conectando a WiFi... ");
    Serial.println(WIFI_SSID);

    // Bloqueamos solo un máximo de 10 segundos en el arranque inicial
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
        delay(500);
        Serial.print(".");
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
        Serial.println("WiFi FAILED - Timeout, continuando...");
        // No bloqueamos más; la auto-reconexión seguirá intentando en segundo plano
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
        pending_messages.push(topic, payload);   // guardar para más tarde
        return false;
    }
    bool ok = client.publish(topic, payload);
    if (!ok) {
        pending_messages.push(topic, payload);   // guardar si falló el envío
    }
    return ok;
}

void flush_message_queue() {
    if (!wifi_connected || !client.connected()) return;

    QueuedMessage msg;
    while (pending_messages.pop(msg)) {
        if (client.publish(msg.topic, msg.payload)) {
            Serial.print("[MQTT] mensaje reenviado: ");
            Serial.println(msg.topic);
        } else {
            // Si falla, lo volvemos a encolar y paramos para no saturar
            pending_messages.push(msg.topic, msg.payload);
            break;
        }
    }
}

void mqtt_loop() {
    // Actualizar el estado de WiFi (sin bloqueos)
    wifi_connected = (WiFi.status() == WL_CONNECTED);

    if (!wifi_connected) {
        // No hacemos nada más, la auto-reconexión trabaja en segundo plano
        return;
    }

    // Mantener MQTT
    if (!client.connected()) {
        reconnect_mqtt();
    }
    client.loop();
    flush_message_queue();
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