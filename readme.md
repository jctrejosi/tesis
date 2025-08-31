## Diseño de autocultivo automatizado

### 1. Modalidad del trabajo de grado

**Proyecto Final (aplicación/ingeniería aplicada).**
 Justificación: la naturaleza del trabajo es de diseño, implementación y validación de un prototipo funcional (hardware + firmware + modelo de control) orientado a resolver un problema práctico: automatización de variables ambientales en un cultivo indoor de pequeña escala.

### 2. Título del trabajo de grado

**Diseño e implementación de un sistema automatizado y escalable para el control de variables ambientales en cultivos indoor basado en ESP32.**

### 3. Introducción y justificación

Los sistemas de agricultura controlada (CEA — Controlled Environment Agriculture) permiten mejorar rendimiento y calidad de cultivos mediante control de iluminación, temperatura, humedad y riego. Sin embargo, las soluciones comerciales suelen ser costosas y poco adaptadas a pequeños productores rurales. Este trabajo propone diseñar y validar un prototipo de bajo costo, modular y escalable que automatice variables críticas en un gabinete indoor (1 m × 1 m × 1.5 m), usando microcontroladores económicos (ESP32), sensores comerciales y estrategias de control (ON/OFF, histéresis, PID).

El proyecto aporta una solución replicable orientada a pequeños agricultores y proyectos de investigación académica: reduce intervención manual, permite registro y telemetría, y considera opciones de alimentación dual (red eléctrica y energía solar) para entornos con suministro inestable. Además aporta conocimiento metodológico (modelado físico y de control) y evidencia experimental para la toma de decisiones en cultivos controlados.

### 4. Objetivo general

Diseñar, implementar y validar un sistema automatizado y escalable que controle iluminación, ventilación, riego y parámetros del medio (temperatura, humedad y pH) en un gabinete indoor, integrando hardware (ESP32, sensores y actuadores), firmware modular y modelos de control, con la opción de alimentación eléctrica por red o por panel solar.

### 5. Objetivos específicos

1. Definir los requerimientos funcionales y de seguridad para un gabinete indoor de 1×1×1.5 m destinado a cultivo de hierbas aromáticas.

2. Seleccionar y justificar componentes hardware para la construcción del sistema automatizado: ESP32, sensores (T/H, pH, luz) y actuadores (relés/SSR, MOSFET, bombas, extractores).

3. Implementar un prototipo MVP que controle la iluminación y la ventilación, riego y registre temperatura y humedad.

4. Desarrollar firmware modular (drivers → API → lógica de control) y una interfaz de telemetría básica (MQTT/HTTP + dashboard).

5. Modelar el comportamiento térmico e hídrico del gabinete (simulación en Python/SciPy) y comparar estrategias de control (ON/OFF vs PID).(ON/OFF, histéresis, PID).

6. Evaluar desempeño experimental (estabilidad de condiciones, consumo energético) y proponer un esquema de escalado y alimentación solar.

7. Documentar procedimientos, resultados experimentales, impactos ambientales y recomendaciones para escalamiento.

### 6. Antecedentes

La literatura sobre CEA muestra avances en iluminación LED de espectro específico, control climático mediante PID y enfoques IoT para monitoreo remoto. Revisiones recientes sostienen que la selección de espectro y la gestión del fotoperiodo impactan significativamente rendimiento y calidad (revisiones en horticultura controlada). Trabajos aplicados demuestran prototipos basados en microcontroladores (ESP32/Arduino) para invernaderos y sistemas hidropónicos, aportando arquitecturas de telemetría y control. En control, numerosos estudios comparan ON/OFF, histogramas con histéresis y controladores PID o adaptativos para mantener temperatura y humedad en rangos óptimos. Finalmente, informes técnicos de energía (NREL y similares) discuten viabilidad de integrar paneles solares y bancos de baterías en instalaciones de CEA a pequeña escala.

### 7. Metodología

**Enfoque:** Diseño experimental y de ingeniería aplicada — combinación de prototipado, simulación y pruebas controladas.

**Fases y actividades:**

1. **Revisión bibliográfica y definición de requisitos (Sem. 1–2):** recopilar parámetros óptimos para especies test (ej. albahaca, menta), rangos de T/H, fotoperiodos, y validar restricciones de seguridad eléctrica y normativa.
2. **Diseño hardware y adquisición (Sem. 3–4):** selección final de componentes: ESP32 DevKit, sensor T/H (SHT31 o DHT22 para pruebas), sensor de luz (BH1750), sensor pH (PH-4502C o similar con acondicionador), módulos de conmutación (SSR para AC, MOSFET para DC), bombas 12 V, fusibles, caja, prensaestopas, y fuente/banco de baterías para pruebas solares. Preparación de BOM y compras.
3. **Implementación MVP (Sem. 5–7):** montaje seguro del gabinete, conexión eléctrica con fusible y protecciones, pruebas de conmutación ON/OFF de bombillo 110 V (SSR/relé), instalación de sensores y lectura básica por ESP32. Generación de firmware base (fail-safe, lectura periódica de sensores, control ON/OFF por histéresis).
4. **Desarrollo de software y telemetría (Sem. 7–9):** firmware modular (drivers para cada sensor/actuador, API interna), comunicación Wi-Fi (MQTT/HTTP), y dashboard mínimo (Flask + React o similar) para registro y visualización.
5. **Modelado y simulación (Sem. 8–10, en paralelo):** modelado dinámico de temperatura y humedad del gabinete usando Python (SciPy, control). Simular respuestas del sistema a fotoperiodo y a conmutaciones del extractor. Evaluar control ON/OFF vs PID y proponer parámetros iniciales.
6. **Integración de riego y pH (Sem. 10–12):** integración de bomba controlada por MOSFET/relé y sonda pH con calibración. Añadir lógicas de dosificación básica y protección.
7. **Arquitectura de alimentación dual (Sem. 11–13):** diseño del sistema de alimentación que permita conexión a red eléctrica y operación con panel solar+batería (dimensionamiento aproximado, controlador de carga, protección). Pruebas en banco con batería.
8. **Pruebas experimentales y recolección de datos (Sem. 12–15):** ejecución de campañas de prueba (24–72 h y hasta 2 semanas) registrando T/H, fotoperiodo, consumo energético y calidad del pH. Evaluar estabilidad del sistema y robustez del firmware.
9. **Análisis, documentación y defensa (Sem. 15–16):** análisis estadístico de resultados, comparación contra objetivos, preparación de informe final, manual técnico y presentación ante el jurado.

**Métodos de análisis:** gráficas temporales, verificación de cumplimiento de rangos (T/H/pH), análisis de consumo energético (Wh), simulaciones comparativas, y evaluación de la escalabilidad (costos y diseño para alimentación solar).

**Consideraciones éticas y legales:** usar especies permitidas para las pruebas (albahaca, lechuga, menta). Cumplir normas de seguridad eléctrica y evitar riesgos a terceros.

### 8. Cronograma de actividades

| Actividad / Semana                     | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | 10   | 11   | 12   | 13   | 14   | 15   | 16   |
| -------------------------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 1. Revisión bibliográfica y requisitos | X    | X    |      |      |      |      |      |      |      |      |      |      |      |      |      |      |
| 2. Diseño y compra de hardware (BOM)   |      | X    | X    |      |      |      |      |      |      |      |      |      |      |      |      |      |
| 3. Montaje físico del gabinete         |      |      | X    | X    |      |      |      |      |      |      |      |      |      |      |      |      |
| 4. Firmware MVP (ON/OFF)               |      |      |      | X    | X    |      |      |      |      |      |      |      |      |      |      |      |
| 5. Integración sensores T/H y luz      |      |      |      |      | X    | X    |      |      |      |      |      |      |      |      |      |      |
| 6. Telemetría e interfaz (Flask/React) |      |      |      |      |      | X    | X    |      |      |      |      |      |      |      |      |      |
| 7. Modelado y simulaciones (Python)    |      |      |      |      |      |      | X    | X    | X    |      |      |      |      |      |      |      |
| 8. Integración riego / pH              |      |      |      |      |      |      |      | X    | X    | X    |      |      |      |      |      |      |
| 9. Diseño alimentación solar           |      |      |      |      |      |      |      |      | X    | X    | X    |      |      |      |      |      |
| 10. Pruebas experimentales (24h–2sem)  |      |      |      |      |      |      |      |      |      | X    | X    | X    | X    |      |      |      |
| 11. Análisis de datos y redacción      |      |      |      |      |      |      |      |      |      |      | X    | X    | X    | X    | X    |      |
| 12. Preparación defensa y entrega      |      |      |      |      |      |      |      |      |      |      |      |      |      | X    | X    | X    |

### 9. Resultados y aportes

###### **Resultados esperados:**

- Prototipo funcional de gabinete indoor (1×1×1.5m) con: control de iluminación, control de ventilación, riego automático básico, sensores T/H, sensor de luz, sensor pH integrado y registro de datos.
- Firmware modular documentado (drivers, API de control, lógica de seguridad).
- Dashboard web para monitoreo y registr.
- Modelos y simulaciones en Python del comportamiento térmico/higrométrico del gabinete y comparativa de estrategias de control.
- Análisis energético con propuesta de esquema de alimentación dual (red + solar) y dimensionamiento preliminar del sistema fotovoltáico.
- Documento final de tesis, manual técnico de montaje y un artículo en formato corto (con resultados experimentales).

###### **Aportes específicos:**

- Demostrar viabilidad técnica y económica de una solución de automatización de bajo costo para pequeños productores.
- Metodología reproducible para integración hardware–software y criterios de diseño para operación con energía solar.
- Conjunto de datos experimentales para análisis comparativo de estrategias de control en un entorno controlado.

### 10. Bibliografía