#include <Arduino.h>
#include <math.h>

#define THERMISTOR_PIN 15  // D15
#define R_FIXED 10000.0    // resistencia fija del divisor en ohm
#define BETA 3950.0        // coeficiente Beta del NTC
#define R0 10000.0         // resistencia NTC a 25°C
#define T0 298.15          // 25°C en Kelvin (25°C)

// Función para leer temperatura en °C
float leerTemperatura() {
  int adcValue = analogRead(THERMISTOR_PIN);  // 0-4095
  float voltage = adcValue * (3.3 / 4095.0);

  // Evitar división por cero
  if (voltage <= 0.0) voltage = 0.001;

  // Calcular resistencia del NTC
  float R_NTC = R_FIXED * (3.3 / voltage - 1.0);

  // Fórmula Beta para temperatura
  float tempK = 1.0 / (log(R_NTC / R0) / BETA + 1.0 / T0);

  return tempK - 273.15;  // Celsius
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Leyendo temperatura...");
}

void loop() {
  float tempC = leerTemperatura();
  Serial.print("Temperatura: ");
  Serial.print(tempC);
  Serial.println(" °C");
  delay(1000);  // leer cada segundo
}
