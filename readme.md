## Sistema de cultivo automatizado con inteligencia artificial para monitoreo y control ambienta

### 1. Modalidad del trabajo de grado

**Proyecto Final (aplicación/ingeniería aplicada).**
La naturaleza del trabajo es de diseño, implementación y validación de un prototipo funcional (hardware + firmware + modelo de control) orientado a resolver un problema práctico: automatización de variables ambientales en un cultivo indoor de pequeña escala.

### 2. Título del trabajo de grado

**Sistema de cultivo automatizado con inteligencia artificial para monitoreo y control ambiental**

### 3. Introducción y justificación

La agricultura de entorno controlado (CEA, *Controlled Environment Agriculture*) ha demostrado ser una alternativa eficaz para optimizar la producción vegetal al permitir la regulación precisa de variables ambientales como la temperatura, humedad, iluminación y riego. Sin embargo, la mayoría de las soluciones comerciales presentan altos costos, configuraciones cerradas y poca flexibilidad para adaptarse a las condiciones y necesidades de pequeños productores o proyectos experimentales.

En este contexto, se pretende dezsarrollar un **prototipo de cultivo indoor automatizado, modular y de bajo costo**, basado en microcontroladores, sensores para leer variables ambientales, cámaras de monitoreo y estrategias mixtas de control (**ON/OFF, histéresis y PID**). El sistema busca mantener condiciones óptimas en un gabinete de cultivo de **1 m × 1 m × 1.6 m**, registrando y transmitiendo datos en tiempo real mediante una arquitectura escalable orientada a **telemetría, análisis y visualización**.

Este proyecto se distingue por integrar el **modelado físico del entorno de cultivo** con la **validación experimental de estrategias de control**, permitiendo cuantificar la respuesta dinámica del sistema ante perturbaciones térmicas y de humedad. Los resultados obtenidos —incluyendo la caracterización eléctrica del medio y la estimación de parámetros del modelo de Cole— evidencian la viabilidad técnica del enfoque propuesto para el manejo automatizado de cultivos a pequeña escala.

El trabajo no solo ofrece una **solución tecnológica replicable**, sino también una **base metodológica** para futuras implementaciones de inteligencia artificial en la regulación adaptativa de variables ambientales. Con ello, se contribuye a la democratización del acceso a tecnologías de agricultura controlada, fortaleciendo la sostenibilidad, la experimentación académica y la capacidad de innovación en entornos de recursos limitados.

### 4. Objetivo general

Diseñar, implementar y validar un **sistema automatizado, modular y escalable** para el control integral de un **gabinete de cultivo indoor**, capaz de regular de forma precisa la **iluminación, ventilación, riego y variables del medio (temperatura, humedad, tierra fértil)**.  
El sistema integrará **hardware usando como microcontrolador un ESP32**, sensores y actuadores comerciales, junto con un **firmware estructurado y modelos de control (ON/OFF, histéresis y PID)**, garantizando **operación continua mediante alimentación dual** desde la red eléctrica o un sistema **fotovoltáico**.

### 5. Objetivos específicos

1. Definir los requerimientos funcionales y de seguridad para un gabinete indoor de 1×1×1.5 m destinado a cultivo de hierbas medicinales y comestibles.

2. Seleccionar y justificar los componentes de hardware para la construcción del sistema automatizado: ESP32, sensores (T/H, pH, luz, MOSFET) y actuadores (relés/SSR, bombas, extractores, iluminación).

3. Implementar un prototipo MVP que controle la iluminación, la ventilación y el riego, y registre variables ambientales como temperatura, humedad, conductividad, impedancia eléctrica, y tome fotografías para analizar el estado fisiológico y las condiciones de crecimiento de las plantas.

4. Desarrollar firmware modular (drivers → API → lógica de control) y una interfaz de telemetría (HTTP + dashboard).

5. Modelar el comportamiento térmico e hídrico del gabinete y comparar con distintas estrategias de control.

6. Evaluar el desempeño del sistema en términos de estabilidad de las condiciones ambientales y eficiencia energética, y formular una propuesta de escalado para su implementación a mayor capacidad o en múltiples módulos.

7. Documentar procedimientos, resultados experimentales, impactos ambientales y recomendaciones para escalamiento.

### 6. Antecedentes

Los sistemas de agricultura en ambiente controlado (CEA) han mostrado un desarrollo acelerado en la última década, impulsado por mejoras en la iluminación LED, sensores de bajo costo y plataformas IoT que facilitan la instrumentación y el control del microclima. Revisiones recientes del estado del arte muestran que gran parte de la investigación se concentra en la interacción planta-luz y en optimizaciones energéticas para reducir el coste operativo, aunque persisten brechas en soluciones de bajo costo y alta modularidad adecuadas para pequeña escala. 

En el plano del control, la literatura compara ampliamente soluciones simples (ON/OFF por histéresis) frente a controladores PID y variantes adaptativas, identificando un compromiso clásico entre complejidad de diseño, estabilidad y consumo energético; estudios experimentales demuestran que la elección y ajuste del controlador influyen de forma significativa en el sobrepico térmico, el tiempo de asentamiento y la oscilación del sistema. 

Para el monitoreo del estado del sustrato y de la planta, la espectroscopía de impedancia (EIS) ha emergido como una técnica no destructiva valiosa para inferir propiedades fisiológicas y de humedad del medio, y las revisiones recientes describen tanto los modelos analíticos (Cole y variantes) como enfoques basados en aprendizaje automático para interpretación de espectros. 

Por otro lado, la proliferación de prototipos basados en microcontroladores (p. ej. ESP32) evidencia la viabilidad de arquitecturas telemétricas y dashboards de bajo coste; sin embargo, muchos proyectos publicados carecen de evaluaciones energéticas completas y de estudios de escalabilidad y seguridad eléctrica, lo que limita su transferencia a entornos productivos. Finalmente, los estudios de integración fotovoltaica y almacenamiento determinan que la reducción de costes en módulos y baterías mejora la factibilidad de soluciones autónomas a pequeña escala, aunque el dimensionamiento debe considerar picos de demanda por iluminación y bombas.

### 7. Metodología

**Enfoque:** Diseño experimental y de ingeniería aplicada — combinación de prototipado, simulación y pruebas controladas.

**Actividades**

1. **Revisión bibliográfica y definición de requisitos (Sem. 1–2):**  
   Recopilar parámetros óptimos para distintas especies de hierbas, rangos de temperatura y humedad, fotoperiodos y requerimientos de riego. Validar restricciones de seguridad eléctrica y normativa aplicable.

2. **Diseño del hardware (Sem. 3–4):**  
   Selección de componentes (ESP32 DevKit, sensores de T/H, luz y pH, módulos de conmutación, fuentes y protecciones). Elaboración de la lista de materiales (BOM) y verificación de compatibilidad eléctrica.

3. **Desarrollo de software y telemetría (Sem. 5–8):**  
   Estructuración modular del firmware (drivers, API interna, lógica de control). Integración IoT para transmisión de datos y creación de un dashboard mínimo para registro y visualización remota.

4. **Implementación del prototipo MVP (Sem. 8–10):**  
   Montaje seguro del gabinete de cultivo, cableado de potencia y control, instalación de sensores y actuadores. Desarrollo del firmware base con lectura periódica de sensores, control ON/OFF por histéresis y funciones de seguridad (fail-safe).

5. **Modelado y simulación de control (Sem. 10–12):**  
   Simular el comportamiento del sistema ante variaciones de las condiciones ambientales y operativas (iluminación, ventilación, riego). Comparar los esquemas de control por histéresis y PID y definir parámetros iniciales de ajuste.

6. **Pruebas experimentales y recolección de datos (Sem. 12–14):**  
   Ejecución de campañas de prueba de corto y mediano plazo (24–72 h y hasta 2 semanas). Registro continuo de variables: temperatura, humedad, fotoperiodo, consumo energético y condiciones del sustrato. Evaluación de estabilidad y respuesta del sistema.

7. **Análisis de resultados y evaluación del cultivo (Sem. 14–15):**  
   Procesamiento estadístico de los datos experimentales, evaluación de desempeño de controladores (PID vs histéresis) y análisis del desarrollo vegetal (biomasa, humedad de hoja o crecimiento relativo según la especie seleccionada).

8. **Documentación y presentación final (Sem. 16):**  
   Consolidación de resultados técnicos y experimentales, elaboración del informe final, manual técnico de operación y presentación ante el jurado o comité evaluador.

**Métodos de análisis:**  

- Se emplearán métodos cuantitativos y comparativos para evaluar el desempeño global del sistema automatizado.  
- Se generarán **gráficas temporales** de las variables ambientales y eléctricas (temperatura, humedad, iluminación, humedad del sustrato, tierra fértil, flujo de agua, contaminación del agua), con el fin de analizar la estabilidad, los tiempos de respuesta y la dinámica de control bajo distintas condiciones operativas.  

- Se realizará la **verificación de cumplimiento de rangos óptimos** definidos para el cultivo, así como la detección de desviaciones, oscilaciones y sobrecorrecciones asociadas a los esquemas de control (histéresis y PID).  

- El **análisis energético** incluirá el cálculo del consumo total y parcial por subsistema (iluminación, ventilación, riego y control electrónico), para determinar la eficiencia relativa.  

- Se efectuarán **simulaciones comparativas** entre estrategias de control y configuraciones de hardware, considerando su impacto sobre la estabilidad del cultivo.

- Finalmente, se evaluará la **escalabilidad del sistema**, analizando costos, modularidad, capacidad de expansión a mayores volúmenes de cultivo y factibilidad de implementación de alimentación solar u otras fuentes sostenibles.

### 8. Cronograma de actividades

| Actividad / Semana                                       | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
| -------------------------------------------------------- | - | - | - | - | - | - | - | - | - | -- | -- | -- | -- | -- | -- | -- |
| 1. Revisión bibliográfica y requisitos                   | X | X |   |   |   |   |   |   |   |    |    |    |    |    |    |    |
| 2. Diseño hardware                                       |   |   | X | X | X |   |   |   |   |    |    |    |    |    |    |    |
| 3. Desarrollo de software y telemetría                   |   |   |   |   | X | X | X | X |   |    |    |    |    |    |    |    |
| 4. Implementación del prototipo MVP                      |   |   |   |   |   |   |   | X | X | X  |    |    |    |    |    |    |
| 5. Modelado y simulación de control                      |   |   |   |   |   |   |   |   |   | X  | X  | X  |    |    |    |    |
| 6. Pruebas experimentales y recolección de datos         |   |   |   |   |   |   |   |   |   |    |    |    | X  | X  | X  |    |
| 7. Análisis de resultados y evaluación del cultivo       |   |   |   |   |   |   |   |   |   |    |    |    |    | X  | X  |    |
| 8. Documentación y presentación final                    |   |   |   |   |   |   |   |   |   |    |    |    |    |    |    | X  |

### 9. Resultados y aportes

- **Prototipo funcional del sistema** con control automático de iluminación, ventilación y riego, equipado con sensores para monitorear las principales variables ambientales y de operación (como temperatura, humedad, luminosidad, pH y consumo energético), además de registro continuo de datos.  
- **Firmware modular documentado**, estructurado en controladores, API de comunicación y rutinas de seguridad, diseñado para facilitar el mantenimiento, escalabilidad e integración con nuevas variables o actuadores.  
- **Dashboard web de monitoreo y gestión**, con visualización en tiempo real, registro histórico, alarmas configurables y herramientas para análisis comparativo.  
- **Modelos y simulaciones del comportamiento del sistema**, considerando la respuesta de las variables ambientales ante diferentes estrategias de control y condiciones de operación.  
- **Evaluación del rendimiento energético**, incluyendo balance de consumo, estimación de eficiencia, análisis de costos y autonomía.  
- **Documentación técnica completa**, compuesta por el informe de tesis, manual de montaje y operación, y un artículo técnico en formato corto con resultados experimentales.

###### **Aportes específicos**

- **Validación técnica y económica** de una solución de automatización de bajo costo aplicable a pequeños productores, laboratorios o entornos educativos.  
- **Metodología reproducible** para la integración hardware–software y desarrollo de sistemas de control ambiental, adaptable a diversas condiciones y fuentes de energía.  
- **Generación de un conjunto de datos experimentales estandarizados**, útiles para análisis de comportamiento, evaluación de estrategias de control y desarrollo de algoritmos basados en inteligencia artificial para entregar información al usuario.  
- **Propuesta de arquitectura escalable y modular**, con criterios técnicos para diseño, mantenimiento y expansión del sistema en función de nuevas variables de monitoreo.

### 10. Sensores del ESP32

El firmware del ESP32 controla **4 sensores** y un **módulo de 4 relés** para actuadores. Cada sensor sigue un patrón modular (driver → config → sensor → publisher → command_handler) y se comunica con el backend vía MQTT.

#### Resumen de sensores

| # | Sensor | Alias MQTT | Interfaz | Intervalo | Variables que mide |
|---|--------|------------|----------|-----------|--------------------|
| 1 | **BME680** | `bme680` | I²C | 15 s | Temperatura, Humedad, Presión atmosférica, Resistencia de gas (VOC/IAQ) |
| 2 | **AS7341** | `as7341` | I²C | configurable | 10 canales espectrales (F1 415nm → F8 680nm + Clear + NIR) |
| 3 | **MH-Z19B** | `mhz19b` | UART | 20 s | CO₂ (ppm) |
| 4 | **Soil EC RS485** | `soil_ec` | RS485 (UART2) | 25 s | Conductividad eléctrica (mS/cm), Temperatura del suelo |

---

#### 1. BME680 — Sensor ambiental

| Parámetro configurable | Default | Descripción |
|---|---|---|
| `interval_ms` | 15000 | Frecuencia de lectura (ms) |
| `simulation` | false | Modo simulación (sin hardware) |
| `temp_oversample` | 8x | Oversampling de temperatura |
| `hum_oversample` | 2x | Oversampling de humedad |
| `press_oversample` | 4x | Oversampling de presión |
| `iir_filter` | 3 | Filtro IIR (0-3) |
| `gas_heater_temp` | 320 °C | Temperatura del calentador de gas |
| `gas_heater_duration` | 150 ms | Duración del calentador |

> 📤 **Publica:** `growbox/bme680/data`  
> 📥 **Recibe:** `growbox/bme680/read`, `growbox/bme680/config`

---

#### 2. AS7341 — Sensor espectral (10 canales)

| Parámetro configurable | Default | Descripción |
|---|---|---|
| `interval_ms` | configurable | Frecuencia de lectura (ms) |
| `simulation` | false | Modo simulación |
| `atime` | configurable | Tiempo de integración ADC |
| `astep` | configurable | Step size de integración |
| `gain` | configurable | Ganancia del sensor |
| `led_enabled` | configurable | LED de iluminación integrado |
| `led_current_ma` | configurable | Corriente del LED (mA) |

**Canales espectrales:**

| Canal | Longitud de onda | Tipo |
|---|---|---|
| F1 | 415 nm | Violeta |
| F2 | 445 nm | Azul |
| F3 | 480 nm | Cyan |
| F4 | 515 nm | Verde |
| F5 | 555 nm | Amarillo |
| F6 | 590 nm | Naranja |
| F7 | 630 nm | Rojo |
| F8 | 680 nm | Rojo profundo |
| Clear | — | Sin filtro (referencia) |
| NIR | — | Infrarrojo cercano |

> 📤 **Publica:** `growbox/as7341/data`  
> 📥 **Recibe:** `growbox/as7341/read`, `growbox/as7341/config`

---

#### 3. MH-Z19B — Sensor de CO₂

| Parámetro configurable | Default | Descripción |
|---|---|---|
| `interval_ms` | 20000 | Frecuencia de lectura (ms) |
| `simulation` | false | Modo simulación |
| `auto_calibration` | false | Calibración automática (ABC) |

> 📤 **Publica:** `growbox/mhz19b/data`  
> 📥 **Recibe:** `growbox/mhz19b/read`, `growbox/mhz19b/config`

---

#### 4. Soil EC RS485 — Sensor de suelo

| Parámetro configurable | Default | Descripción |
|---|---|---|
| `interval_ms` | 25000 | Frecuencia de lectura (ms) |
| `simulation` | false | Modo simulación |
| `modbus_slave_id` | 1 | Dirección Modbus del esclavo |
| `modbus_function` | 0x03 | Código de función Modbus |
| `modbus_ec_register` | 0x0000 | Dirección del registro EC |
| `modbus_temp_register` | 0x0001 | Dirección del registro de temperatura |
| `ec_scale_factor` | 100.0 | Factor de escala EC (entero → mS/cm) |
| `temp_scale_factor` | 10.0 | Factor de escala temperatura (entero → °C) |
| `read_temperature` | true | Leer también temperatura del suelo |
| `uart_port` | 2 | Puerto UART |
| `baudrate` | 9600 | Velocidad de comunicación |
| `rx_pin` / `tx_pin` | 16 / 17 | Pines RX/TX |
| `de_pin` / `re_pin` | -1 | Control RS485 (opcional) |
| `use_temperature_compensation` | true | Compensación por temperatura |
| `retries` | 3 | Reintentos de lectura |
| `response_timeout_ms` | 200 | Timeout de respuesta (ms) |

> 📤 **Publica:** `growbox/soil_ec/data`  
> 📥 **Recibe:** `growbox/soil_ec/read`, `growbox/soil_ec/config`

---

#### ⚡ Actuador de Relé (4 canales)

Además de los sensores, el ESP32 controla un módulo de relés de 4 canales para actuar sobre el entorno de cultivo.

| Parámetro configurable | Descripción |
|---|---|
| `pin_in1` – `pin_in4` | Pines GPIO para cada canal |
| `inverted` | Lógica invertida (activo bajo) |
| `simulation` | Modo simulación |
| `interval_ms` | Frecuencia de publicación de estado |
| `publish_interval_ms` | Intervalo de publicación independiente |

**Canales mapeados:**

| Canal | Nombre | Descripción |
|---|---|---|
| 1 | `canal_1` | Ventilación principal |
| 2 | `canal_2` | Iluminación principal |
| 3 | `canal_3` | Riego principal |
| 4 | `canal_4` | Libre / reserva |

> 📤 **Publica:** `growbox/relay/<channel>/state`  
> 📥 **Recibe:** `growbox/relay/<command>`

---

#### 🎛️ Flujo de control

La configuración de sensores fluye desde el dashboard web hasta el ESP32:

```
Dashboard Web → PUT /config/sensors/:alias → Backend → MQTT growbox/<alias>/config → ESP32 → apply_config()
```

Y la telemetría se publica cíclicamente:

```
ESP32 → scheduler (intervalo individual) → leer sensor → MQTT growbox/<alias>/data → Backend → TimescaleDB
```

También se soportan lecturas bajo demanda vía `POST /config/sensors/:alias/read` → `growbox/<alias>/read`.

### 11. Bibliografía

- Cole, K. S., & Cole, R. H. (1941). Dispersion and absorption in dielectrics. I. Alternating-current characteristics. *Journal of Chemical Physics*, 9, 341–351.

- Barsoukov, E., & Macdonald, J. R. (eds.). *Impedance Spectroscopy: Theory, Experiment, and Applications*. Wiley.

- Van Haeverbeke, M. (2023). Plant impedance spectroscopy: a review of modeling approaches. *Frontiers in Plant Science*, 13, 1187573.

- Ma, X., Bifano, L., & Fischerauer, G. (2023). Evaluation of electrical impedance spectra by long short-term memory to estimate nitrate concentrations in soil. *Sensors*, 23(4), 2172.

- Analog Devices. AD5933 impedance converter & network analyzer — datasheet & product page.

- Espressif Systems. *ESP hardware design guidelines* (esp32).

- Navarro, E., Costa, N., & Pereira, A. (2020). A systematic review of IoT solutions for smart farming. *Sensors*, 20(15), 4231.

- NIST. *NIST Handbook 150-2E: National Voluntary Laboratory Accreditation Program — Calibration Laboratories (technical guide for optical radiation measurements)*. (NIST Handbook 150-2E).

- Goodman, J. W. (2017). *Introduction to Fourier Optics* (4th ed.). W. H. Freeman.

- Gonzalez, R. C., & Woods, R. E. (2018). *Digital Image Processing* (4th ed.). Pearson.

- Zwinkels, J. C., et al. (2016). Mise en pratique for the definition of the candela and associated derived units for photometric and radiometric quantities in the SI. *Metrologia*, 53, G1.

- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer.

- Mahalanobis, P. C. (1936). On the generalized distance in statistics. *Proceedings of the National Institute of Sciences (Calcutta)*, 2, 49–55.
