#include <WiFi.h>
#include <WebSocketsClient.h>

#define LED_PIN 2

const char* ssid = "Araña";
const char* password = "";

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {

  switch (type) {

    case WStype_CONNECTED:
      Serial.println("websocket conectado");
      break;

    case WStype_DISCONNECTED:
      Serial.println("websocket desconectado");
      break;

    case WStype_TEXT:
      payload[length] = '\0';
      Serial.print("mensaje recibido: ");
      Serial.println((char*)payload);

      if (strcmp((char*)payload, "on") == 0) {
        digitalWrite(LED_PIN, HIGH);
      }
      else if (strcmp((char*)payload, "off") == 0) {
        digitalWrite(LED_PIN, LOW);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nwifi conectado");

  // WebSocket SIN TLS
  webSocket.begin(
    "timothy-lap-bundle-twelve.trycloudflare.com",
    80,
    "/ws"
  );

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}
