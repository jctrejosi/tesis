# **Documento Técnico – Interfaces de Sensores para ESP32**

## **1. Introducción**

La correcta selección del método de conexión entre sensores y microcontroladores es crítica para la estabilidad, precisión y escalabilidad de un sistema embebido. En el caso de la **ESP32**, el microcontrolador soporta múltiples buses y entradas analógicas/digitales, lo que permite integrar sensores heterogéneos mediante protocolos estandarizados.

Este documento describe los **principales tipos de conectores y protocolos de comunicación**, sus características eléctricas y aplicaciones recomendadas para proyectos de automatización como sistemas de cultivo indoor.

------

## **2. Clasificación de interfaces de sensores**

### **2.1 Sensores de señal digital discreta (1-Wire o GPIO simple)**

- **Descripción:** transmiten datos binarios por un único pin, generalmente con tiempos definidos por software.
- **Ejemplos:** DHT11/DHT22 (temperatura y humedad), DS18B20 (temperatura).
- **Conexión:**
  - VCC (3.3 V)
  - GND
  - DATA → GPIO (requiere resistencia pull-up típica de 4.7 kΩ).
- **Ventajas:** bajo costo, conexión simple, pocos pines usados.
- **Limitaciones:** velocidad baja (~1 Hz), menos robusto ante ruido, no escalable para muchos sensores.

------

### **2.2 Sensores I²C (Inter-Integrated Circuit)**

- **Descripción:** protocolo síncrono de 2 hilos (SDA, SCL) que permite direccionar hasta 127 dispositivos en el mismo bus.
- **Ejemplos:**
  - SHT31, BME280 (temperatura/humedad/presión).
  - BH1750 (iluminancia).
  - Módulos de pH con conversor digital.
- **Conexión:**
  - VCC (3.3 V)
  - GND
  - SDA → GPIO configurado (ej. GPIO21)
  - SCL → GPIO configurado (ej. GPIO22)
- **Ventajas:** solo requiere 2 pines para muchos sensores, buena tolerancia al ruido, ampliamente soportado.
- **Limitaciones:** velocidad moderada (100–400 kHz), longitud de bus limitada (<1 m sin buffers).

------

### **2.3 Sensores analógicos (salida de voltaje)**

- **Descripción:** proporcionan una señal proporcional a la variable medida (0–3.3 V para ESP32).
- **Ejemplos:**
  - Sensores de humedad del suelo resistivos o capacitivos.
  - Algunos módulos de pH de bajo costo.
  - Fotoresistencias (LDR).
- **Conexión:**
  - VCC (3.3 V)
  - GND
  - Salida analógica → pin ADC (p. ej. GPIO34, GPIO35).
- **Ventajas:** simples, bajo costo.
- **Limitaciones:** sensibles al ruido eléctrico, requieren calibración, resolución limitada por ADC interno (12 bits típicos).

------

### **2.4 Sensores SPI (Serial Peripheral Interface)**

- **Descripción:** protocolo síncrono de alta velocidad (hasta decenas de MHz), usa 4–5 pines.
- **Ejemplos:**
  - Conversores ADC externos (MCP3008, ADS1118).
  - Sensores de luz o gas de precisión.
- **Conexión:**
  - VCC (3.3 V)
  - GND
  - MISO, MOSI, SCK, CS → GPIOs configurables.
- **Ventajas:** alta velocidad, mayor resolución que I²C.
- **Limitaciones:** más pines, no tan simple para muchos sensores (requiere un pin CS por sensor).

------

### **2.5 Sensores industriales (4-20 mA, RS-485 / Modbus)**

- **Descripción:** diseñados para ambientes hostiles o largas distancias.
- **Ejemplos:**
  - Transductores de presión/temperatura 4-20 mA.
  - Sensores de humedad/CO₂ industriales con Modbus RTU.
- **Conexión (típica):**
  - 4-20 mA → resistencia de precisión (ej. 250 Ω → 1–5 V) → ADC ESP32.
  - RS-485 → transceptor (MAX485) → UART ESP32.
- **Ventajas:** muy robustos, inmunes al ruido, permiten cableados largos (>100 m).
- **Limitaciones:** costo mayor, requieren módulos de adaptación.

------

## **3. Criterios para la selección del conector y protocolo**

1. **Cantidad de sensores:**
   - Muchos sensores → preferir I²C.
   - Pocos sensores → 1-Wire o GPIO directo.
2. **Precisión requerida:**
   - Alta precisión → I²C o SPI con sensores digitales calibrados.
   - Baja precisión → sensores analógicos simples.
3. **Distancia de cableado:**
   - Corto (<30 cm): cualquier protocolo.
   - Medio (30–100 cm): preferir I²C con cables trenzados o blindados.
   - Largo (>1 m): usar RS-485 o 4-20 mA.
4. **Ambiente eléctrico:**
   - Ambientes ruidosos (motores, relés): usar optoaislamiento o protocolos diferenciales (RS-485).
5. **Costo y escalabilidad:**
   - Prototipo económico: DHT22 + I²C baratos.
   - Sistema profesional: sensores I²C industriales o RS-485.

------

## **4. Recomendaciones para proyectos con ESP32**

- Usar **I²C como bus principal** para sensores ambientales (T/H, luz, presión).
- Usar **ADC interno** solo para sensores analógicos bien filtrados.
- Para sistemas finales, considerar **RS-485 o 4-20 mA** si habrá cableado largo o interferencias.
- Proteger las entradas con **resistencias, filtros RC o TVS diodes** si hay riesgo de picos.
- Asignar **GPIOs separados para relés/SSR** y **otros buses (I²C, SPI)** para evitar conflictos.

## 5. Conexiones que pueden incluirse

- **Entradas analógicas (ADC 0–3.3 V)** → sondas básicas.
- **Entradas digitales GPIO (HIGH/LOW o PWM)** → detectores de movimiento, flotadores.
- **Bus I²C (SDA/SCL)** → sensores ambientales múltiples.
- **Bus SPI (MISO/MOSI/SCK/CS)** → sensores de alta velocidad o precisión.
- **Puertos UART configurables** → sensores CO₂, GPS, módulos de comunicación.
- **Entrada 4–20 mA** (opcional con módulo) → sensores industriales robustos.
- **RS-485/Modbus RTU** (opcional con transceptor) → aplicaciones agrícolas a larga distancia.