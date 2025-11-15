## **Documento: Diseño preliminar del prototipo automatizado basado en ESP32**

### 1. Introducción

Este documento describe el diseño preliminar de un prototipo de automatización para cultivos en espacios controlados (indoor). El objetivo inicial es probar la viabilidad técnica de controlar cargas eléctricas y sensores ambientales usando una placa de desarrollo ESP32, con miras a un sistema escalable y de bajo costo aplicable a diferentes gamas de producción agrícola.

------

### 2. Objetivo del prototipo

- Automatizar el encendido y apagado de un bombillo LED de cultivo de 110 V AC.
- Validar el uso de la placa ESP32 como núcleo de control.
- Documentar la selección de componentes y la arquitectura básica del sistema.
- Establecer las bases para integrar sensores (temperatura, humedad) y futuras funcionalidades como control de ventilación, riego y monitoreo remoto.

------

### 3. Selección de hardware

#### 3.1 Microcontrolador: ESP32 DevKit v1

- **Ventajas**: Wi-Fi y Bluetooth integrados, amplia documentación, bajo costo (~10 USD), 34 GPIOs configurables.
- **Desventajas**: Salidas limitadas a 3.3 V (requiere interfaz para controlar cargas de mayor voltaje), disipación limitada.
- **Razón de elección**: ofrece conectividad para pruebas de IoT, es económica y fácilmente programable en Arduino IDE o PlatformIO.

#### 3.2 Módulo relé para cargas AC

- Permite conmutar un bombillo de 80 W a 110 V de forma segura.
- El relé actúa como aislante entre el microcontrolador y la red eléctrica.
- Costo estimado: 3 USD.
- Se recomienda incluir **fusible en serie** para protección básica.

#### 3.3 Sensor ambiental (opcional para segunda etapa)

- **DHT22**: mide temperatura y humedad relativa (±2 % HR, ±0.5 °C).
- Conectado a GPIO del ESP32, útil para monitorear condiciones de prueba.
- Costo estimado: 5 USD.

#### 3.4 Carga de prueba: Bombillo LED cultivo 80 W

- Corriente aproximada: ~0.7 A a 110 V.
- No requiere control de intensidad (modo ON/OFF).
- Costo estimado: 8–12 USD.
- Adecuado para validar el control básico y establecer consumo eléctrico.

------

### 4. Esquema eléctrico básico

1. **ESP32 GPIO** → **Transistor o relé** → **Bombillo LED (110 V)**
2. Alimentación del ESP32 vía USB o fuente 5 V.
3. Fusible en serie con el bombillo para seguridad.
4. Conexiones protegidas y aisladas (caja plástica o regleta).

*(Insertar diagrama en Draw.io o Fritzing)*

------

### 5. Lista de materiales (BOM)

| Componente                   | Cant. | Precio aprox (USD) | Función                                   |
| ---------------------------- | ----- | ------------------ | ----------------------------------------- |
| ESP32 DevKit v1              | 1     | 10                 | Control principal, ejecución del firmware |
| Módulo relé 1 canal          | 1     | 3                  | Conmutación segura de 110 V               |
| Bombillo LED cultivo 80 W    | 1     | 8–12               | Carga inicial de prueba                   |
| Fusible + portafusible       | 1     | 1                  | Protección de la línea                    |
| Sensor DHT22 (opcional)      | 1     | 5                  | Medición de temperatura y humedad         |
| Cables, borneras, protoboard | -     | 5                  | Conexiones seguras                        |
| Multímetro (si no se tiene)  | 1     | 20                 | Medición y diagnóstico                    |

**Costo estimado del prototipo inicial:** ~27–30 USD (sin herramientas).

------

### 6. Procedimiento experimental

1. **Montaje eléctrico seguro** en protoboard o tablero de pruebas.
2. **Programación del ESP32** con un sketch básico:
   - GPIO configurado como salida digital.
   - Activación/desactivación del relé en intervalos de tiempo.
3. **Verificación eléctrica:** medir tensión de control (3.3 V) y tensión en el relé (110 V).
4. **Prueba con carga real:** conectar el bombillo LED y registrar su comportamiento.
5. **Documentación:** registrar temperatura del relé, estabilidad del sistema y cualquier ruido eléctrico.

------

### 7. Consideraciones de escalabilidad

- **Control de intensidad de luz**: no viable con relé, se requiere MOSFET o driver especializado si el bombillo fuera DC.
- **Seguridad eléctrica:** la caja debe ser ignífuga y cerrada para evitar contacto accidental con AC.
- **Compatibilidad futura:** la lógica de control puede diseñarse en firmware y API independiente del hardware, facilitando migrar a placas más potentes (STM32, Raspberry Pi) o más económicas (Arduino UNO, ESP8266).
- **Impacto ambiental:** se evaluará eficiencia energética y alternativas sostenibles (p. ej. luz natural suplementada).

------

### 8. Conclusiones preliminares

- La ESP32 es una opción adecuada para prototipado rápido y pruebas de bajo costo.
- La automatización básica de luz (ON/OFF) es sencilla y segura con un módulo relé bien dimensionado.
- Este prototipo es la base para integrar sensores y, posteriormente, modelar el impacto ambiental y energético del sistema indoor.
- La arquitectura puede adaptarse a diferentes escalas productivas cambiando solo los módulos de potencia.

------

### 9. Referencias

1. Espressif Systems. *ESP32 Technical Reference Manual*.
2. Random Nerd Tutorials. *ESP32 Relay Module AC/DC Control*.
3. IEEE Xplore. *Low-cost IoT-based greenhouse monitoring systems*.
4. All About Circuits. *Best practices for AC and DC switching in microcontroller projects*.

------