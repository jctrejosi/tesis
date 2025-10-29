## Diseño de autocultivo automatizado

### 1. Modalidad del trabajo de grado

**Proyecto Final (aplicación/ingeniería aplicada).**
 Justificación: la naturaleza del trabajo es de diseño, implementación y validación de un prototipo funcional (hardware + firmware + modelo de control) orientado a resolver un problema práctico: automatización de variables ambientales en un cultivo indoor de pequeña escala.

### 2. Título del trabajo de grado

**Sistema de cultivo indoor automatizado con inteligencia artificial para monitoreo y control ambienta**

### 3. Introducción y justificación

Los sistemas de agricultura controlada (CEA — Controlled Environment Agriculture) permiten mejorar el rendimiento y calidad de cultivos mediante control de iluminación, temperatura, humedad y riego. Sin embargo, las soluciones comerciales suelen ser costosas y poco adaptadas a pequeños productores rurales.
Este trabajo propone diseñar y validar un prototipo de bajo costo, modular y escalable que automatice variables críticas en un gabinete indoor (1 m × 1 m × 1.5 m), usando microcontroladores económicos (ESP32), sensores comerciales y estrategias de control (ON/OFF, histéresis, PID).

El proyecto aporta una solución replicable orientada a pequeños agricultores y proyectos de investigación académica: reduce intervención manual, permite registro y telemetría, y considera opciones de alimentación dual (red eléctrica y energía solar) para entornos con suministro inestable. Además aporta conocimiento metodológico (modelado físico y de control) y evidencia experimental para la toma de decisiones en cultivos controlados.

### 4. Objetivo general

Diseñar, implementar y validar un sistema automatizado y escalable que controle iluminación, ventilación, riego y parámetros del medio (temperatura, humedad y pH) en un gabinete indoor, integrando hardware (ESP32, sensores y actuadores), firmware modular y modelos de control, con la opción de alimentación eléctrica por red o por panel solar.

### 5. Objetivos específicos

1. Definir los requerimientos funcionales y de seguridad para un gabinete indoor de 1×1×1.5 m destinado a cultivo de hierbas arómáticas y comestibles.

2. Seleccionar y justificar componentes hardware para la construcción del sistema automatizado: ESP32, sensores (T/H, pH, luz, MOSFET) y actuadores (relés/SSR, bombas, extractores, iluminación).

3. Implementar un prototipo MVP que controle la iluminación, la ventilación y el riego, y registre variables ambientales como temperatura, humedad, conductividad, impedancia eléctrica y ángulo de fase, para analizar el estado fisiológico y las condiciones de crecimiento de las plantas en el sistema indoor automatizado.

4. Desarrollar firmware modular (drivers → API → lógica de control) y una interfaz de telemetría básica (HTTP + dashboard).

5. Modelar el comportamiento térmico e hídrico del gabinete y comparar con distintas estrategias de control.

6. Evaluar el desempeño experimental del sistema en términos de estabilidad de las condiciones ambientales y eficiencia energética, y formular una propuesta de escalado para su implementación a mayor capacidad o en múltiples módulos.

7. Documentar procedimientos, resultados experimentales, impactos ambientales y recomendaciones para escalamiento.

### 6. Antecedentes

La literatura sobre CEA muestra avances en iluminación LED de espectro específico, control climático mediante PID y enfoques IoT para monitoreo remoto. Revisiones recientes sostienen que la selección de espectro y la gestión del fotoperiodo impactan significativamente rendimiento y calidad (revisiones en horticultura controlada). Trabajos aplicados demuestran prototipos basados en microcontroladores (ESP32/Arduino) para invernaderos y sistemas hidropónicos, aportando arquitecturas de telemetría y control. En control, numerosos estudios comparan ON/OFF, histogramas con histéresis y controladores PID o adaptativos para mantener temperatura y humedad en rangos óptimos. Finalmente, informes técnicos de energía (NREL y similares) discuten viabilidad de integrar paneles solares y bancos de baterías en instalaciones de CEA a pequeña escala.

### 7. Metodología

**Enfoque:** Diseño experimental y de ingeniería aplicada — combinación de prototipado, simulación y pruebas controladas.

**Fases y actividades**

1. **Revisión bibliográfica y definición de requisitos (Sem. 1–2):**  
   Recopilar parámetros óptimos para distintas especies de hierbas, rangos de temperatura y humedad, fotoperiodos y requerimientos de riego. Validar restricciones de seguridad eléctrica y normativa aplicable.

2. **Diseño hardware y adquisición (Sem. 3–4):**  
   Selección de componentes (ESP32 DevKit, sensores de T/H, luz y pH, módulos de conmutación, fuentes y protecciones). Elaboración de la lista de materiales (BOM) y verificación de compatibilidad eléctrica.

3. **Implementación del prototipo MVP (Sem. 5–7):**  
   Montaje seguro del gabinete de cultivo, cableado de potencia y control, instalación de sensores y actuadores. Desarrollo del firmware base con lectura periódica de sensores, control ON/OFF por histéresis y funciones de seguridad (fail-safe).

4. **Desarrollo de software y telemetría (Sem. 7–9):**  
   Estructuración modular del firmware (drivers, API interna, lógica de control). Integración IoT para transmisión de datos y creación de un dashboard mínimo para registro y visualización remota.

5. **Modelado y simulación de control (Sem. 9–10):**  
   Simular el comportamiento del sistema ante variaciones de las condiciones ambientales y operativas (iluminación, ventilación, riego). Comparar los esquemas de control por histéresis y PID y definir parámetros iniciales de ajuste.

6. **Integración del sistema de riego (Sem. 10–12):**  
   Implementar la bomba controlada mediante MOSFET o relé, integrar los sensores de humedad del sustrato y flujo de agua, y desarrollar las lógicas básicas de dosificación, calibración y protección del sistema.

7. **Pruebas experimentales y recolección de datos (Sem. 12–14):**  
   Ejecución de campañas de prueba de corto y mediano plazo (24–72 h y hasta 2 semanas). Registro continuo de variables: temperatura, humedad, fotoperiodo, consumo energético y condiciones del sustrato. Evaluación de estabilidad y respuesta del sistema.

8. **Análisis de resultados y evaluación del cultivo (Sem. 14–15):**  
   Procesamiento estadístico de los datos experimentales, evaluación de desempeño de controladores (PID vs histéresis) y análisis del desarrollo vegetal (biomasa, humedad de hoja o crecimiento relativo según la especie seleccionada).

9. **Documentación y presentación final (Sem. 16):**  
   Consolidación de resultados técnicos y experimentales, elaboración del informe final, manual técnico de operación y presentación ante el jurado o comité evaluador.


**Métodos de análisis:**  
Se emplearán métodos cuantitativos y comparativos para evaluar el desempeño global del sistema automatizado.  
Se generarán **gráficas temporales** de las variables ambientales y eléctricas (temperatura, humedad, iluminación, humedad del sustrato, flujo de agua, tensión, corriente y potencia), con el fin de analizar la estabilidad, los tiempos de respuesta y la dinámica de control bajo distintas condiciones operativas.  

Se realizará la **verificación de cumplimiento de rangos óptimos** definidos para cada tipo de planta o cultivo, así como la detección de desviaciones, oscilaciones y sobrecorrecciones asociadas a los esquemas de control (histéresis y PID).  

El **análisis energético** incluirá el cálculo del consumo total y parcial por subsistema (iluminación, ventilación, riego y control electrónico), expresado en Wh y eficiencia relativa.  

Adicionalmente, se efectuarán **simulaciones comparativas** entre estrategias de control y configuraciones de hardware, considerando su impacto sobre la estabilidad ambiental, el consumo energético y la respuesta temporal.  

Finalmente, se evaluará la **escalabilidad del sistema**, analizando costos, modularidad, capacidad de expansión a mayores volúmenes de cultivo y factibilidad de implementación de alimentación solar u otras fuentes sostenibles.

### 8. Cronograma de actividades

| Actividad / Semana                                       | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
| -------------------------------------------------------- | - | - | - | - | - | - | - | - | - | -- | -- | -- | -- | -- | -- | -- |
| 1. Revisión bibliográfica y requisitos                   | X | X |   |   |   |   |   |   |   |    |    |    |    |    |    |    |
| 2. Diseño hardware y adquisición (BOM)                   |   | X | X |   |   |   |   |   |   |    |    |    |    |    |    |    |
| 3. Implementación del prototipo MVP                      |   |   | X | X | X |   |   |   |   |    |    |    |    |    |    |    |
| 4. Desarrollo de software y telemetría                   |   |   |   |   | X | X | X |   |   |    |    |    |    |    |    |    |
| 5. Modelado y simulación de control                      |   |   |   |   |   |   | X | X |   |    |    |    |    |    |    |    |
| 6. Integración del sistema de riego                      |   |   |   |   |   |   |   | X | X | X  |    |    |    |    |    |    |
| 7. Pruebas experimentales y recolección de datos         |   |   |   |   |   |   |   |   | X | X  | X  | X  |    |    |    |    |
| 8. Análisis de resultados y evaluación del cultivo        |   |   |   |   |   |   |   |   |   |    | X  | X  | X  | X  |    |    |
| 9. Documentación y presentación final                    |   |   |   |   |   |   |   |   |   |    |    |    |   | X  | X  | X  |

### 9. Resultados y aportes

- **Prototipo funcional del sistema indoor** (1 × 1 × 1.5 m) con control automático de iluminación, ventilación y riego, equipado con sensores para monitorear las principales variables ambientales y de operación (como temperatura, humedad, luminosidad, pH y consumo energético), además de registro continuo de datos.  
- **Firmware modular documentado**, estructurado en controladores, API de comunicación y rutinas de seguridad, diseñado para facilitar mantenimiento, escalabilidad e integración con nuevas variables o actuadores.  
- **Dashboard web de monitoreo y gestión**, con visualización en tiempo real, registro histórico, alarmas configurables y herramientas para análisis comparativo.  
- **Modelos y simulaciones del comportamiento del sistema**, considerando la respuesta de las variables ambientales ante diferentes estrategias de control y condiciones de operación.  
- **Evaluación del rendimiento energético**, incluyendo balance de consumo, estimación de eficiencia y **dimensionamiento preliminar de un sistema fotovoltaico**, con análisis de costos y autonomía.  
- **Documentación técnica completa**, compuesta por el informe de tesis, manual de montaje y operación, y un artículo técnico en formato corto con resultados experimentales validados.

###### **Aportes específicos**

- **Validación técnica y económica** de una solución de automatización de bajo costo aplicable a pequeños productores, laboratorios o entornos educativos.  
- **Metodología reproducible** para la integración hardware–software y desarrollo de sistemas de control ambiental, adaptable a diversas condiciones y fuentes de energía.  
- **Generación de un conjunto de datos experimentales estandarizados**, útiles para análisis de comportamiento, evaluación de estrategias de control y desarrollo de algoritmos basados en inteligencia artificial.  
- **Propuesta de arquitectura escalable y modular**, con criterios técnicos para diseño, mantenimiento y expansión del sistema en función de nuevas variables o requerimientos energéticos.

### 10. Bibliografía

- Cole, K. S., & Cole, R. H. (1941). Dispersion and absorption in dielectrics. I. Alternating-current characteristics. *Journal of Chemical Physics*, 9, 341–351. :contentReference[oaicite:0]{index=0}

- Barsoukov, E., & Macdonald, J. R. (eds.). *Impedance Spectroscopy: Theory, Experiment, and Applications*. Wiley. :contentReference[oaicite:1]{index=1}

- Van Haeverbeke, M. (2023). Plant impedance spectroscopy: a review of modeling approaches. *Frontiers in Plant Science*, 13, 1187573. :contentReference[oaicite:2]{index=2}

- Ma, X., Bifano, L., & Fischerauer, G. (2023). Evaluation of electrical impedance spectra by long short-term memory to estimate nitrate concentrations in soil. *Sensors*, 23(4), 2172. :contentReference[oaicite:3]{index=3}

- Analog Devices. AD5933 impedance converter & network analyzer — datasheet & product page. :contentReference[oaicite:4]{index=4}

- Analog Devices. AD5940 / AD5941 analog front end (AFE) — datasheet & product page. :contentReference[oaicite:5]{index=5}

- Espressif Systems. *ESP hardware design guidelines* (esp32). :contentReference[oaicite:6]{index=6}

- Navarro, E., Costa, N., & Pereira, A. (2020). A systematic review of IoT solutions for smart farming. *Sensors*, 20(15), 4231. :contentReference[oaicite:7]{index=7}

- NIST. *NIST Handbook 150-2E: National Voluntary Laboratory Accreditation Program — Calibration Laboratories (technical guide for optical radiation measurements)*. (NIST Handbook 150-2E). :contentReference[oaicite:8]{index=8}

- Goodman, J. W. (2017). *Introduction to Fourier Optics* (4th ed.). W. H. Freeman. :contentReference[oaicite:9]{index=9}

- Gonzalez, R. C., & Woods, R. E. (2018). *Digital Image Processing* (4th ed.). Pearson. :contentReference[oaicite:10]{index=10}

- Zwinkels, J. C., et al. (2016). Mise en pratique for the definition of the candela and associated derived units for photometric and radiometric quantities in the SI. *Metrologia*, 53, G1. :contentReference[oaicite:11]{index=11}

- Bishop, C. M. (2006). *Pattern Recognition and Machine Learning*. Springer. :contentReference[oaicite:12]{index=12}

- Mahalanobis, P. C. (1936). On the generalized distance in statistics. *Proceedings of the National Institute of Sciences (Calcutta)*, 2, 49–55. :contentReference[oaicite:13]{index=13}
