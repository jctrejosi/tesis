#include <WiFi.h>
#include <HTTPClient.h>

#define LED_PIN 2

const char* ssid = "Araña";
const char* password = "";

const char* api = "https://youth-horse-journalist-packing.trycloudflare.com/api/led/status";

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.print("reset reason: ");
  Serial.println(esp_reset_reason());

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("conectando a wifi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nwifi conectado");
  Serial.print("ip local: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("consultando api...");

    WiFiClientSecure client;
    client.setInsecure();   // <-- CLAVE

    HTTPClient http;
    http.begin(client, api);

    int code = http.GET();
    Serial.print("codigo http: ");
    Serial.println(code);

    if (code == 200) {
      String payload = http.getString();
      Serial.print("respuesta: ");
      Serial.println(payload);

      if (payload.indexOf("on") >= 0) {
        Serial.println("led ON");
        digitalWrite(LED_PIN, HIGH);
      } else {
        Serial.println("led OFF");
        digitalWrite(LED_PIN, LOW);
      }
    } else {
      Serial.println("error al consultar api");
    }

    http.end();
  } else {
    Serial.println("wifi desconectado");
  }

  Serial.println("----");
  delay(2000);
}
