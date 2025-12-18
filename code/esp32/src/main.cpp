#include <Arduino.h>
#include <math.h>

#define THERMISTOR_PIN 15   // D15 (ADC)
#define RELAY_PIN 33 // PIN DE SALIDA (NO 34)

#define R_FIXED 10000.0
#define BETA 3950.0
#define R0 10000.0
#define T0 298.15
#define VCC 3.3

#define TEMP_ON 40.0        // umbral en °C

float leerTemperatura() {
  int adcValue = analogRead(THERMISTOR_PIN);
  float voltage = adcValue * (VCC / 4095.0);

  if (voltage <= 0.01 || voltage >= VCC - 0.01) return NAN;

  // NTC abajo, resistencia arriba
  float R_NTC = R_FIXED * (voltage / (VCC - voltage));

  float tempK = 1.0 / (log(R_NTC / R0) / BETA + 1.0 / T0);
  return tempK - 273.15;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);   // relé apagado

  delay(1000);
  Serial.println("Sistema iniciado");
}

void loop() {
  float t = leerTemperatura();

  if (!isnan(t)) {
    Serial.print("Temperatura: ");
    Serial.print(t);
    Serial.println(" °C");

    if (t >= TEMP_ON) {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Relé ON");
    } else {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Relé OFF");
    }
  } else {
    Serial.println("Lectura inválida");
  }

  delay(1000);
}
