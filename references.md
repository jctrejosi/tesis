### Lectura prioritaria (fundamentos y revisiones)

1. **Systematic literature review on Controlled-Environment Agriculture (CEA).**
    Revisión amplia sobre CEA, tecnologías, eficiencia y desafíos. Es ideal para la sección de estado del arte de la tesis. [MDPI](https://www.mdpi.com/2073-4433/13/8/1258?utm_source=chatgpt.com)
2. **“The Effect of LED Light Spectra on the Growth, Yield and Nutritional Quality of Crops”** (revisión, Frontiers / PMC).
    Revisión clara sobre cómo espectros (rojo/azul/otros) afectan fotosíntesis y arquitectura de las plantas — imprescindible para justificar elección de luminaria y espectro. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9919669/?utm_source=chatgpt.com)
3. **Review: Environmental control strategies and models for greenhouses (MDPI Sensors).**
    Describe estrategias de control (ON/OFF, PID, adaptativos, NN), sensores típicos, y métricas de desempeño — útil para la parte de control y modelado. [MDPI](https://www.mdpi.com/1424-8220/25/5/1388?utm_source=chatgpt.com)
4. **Exploring the landscape of controlled environment agriculture — scoping review.**
    Buen panorama contemporáneo sobre dónde se concentra la investigación (LEDs, control, vertical farms). Te ayuda a posicionar tu aporte. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0308521X23000781?utm_source=chatgpt.com)

### Control y algoritmos (práctica de control)

1. **Parameter self-tuning PID control for greenhouse climate** (paper sobre PID adaptativo / fuzzy/PID).
    Implementaciones y comparación de controladores para temperatura/humedad — te servirá para diseñar el controlador del extractor/humidificador. [ResearchGate](https://www.researchgate.net/publication/347267984_Parameter_Self-Tuning_PID_Control_for_Greenhouse_Climate_Control_Problem?utm_source=chatgpt.com)
2. **PID Control for Greenhouse Climate Regulation: A Review.**
    Revisión específica sobre PID: ventajas, limitaciones y aplicaciones prácticas en invernaderos. Útil para justificar usar PID vs ON/OFF. [DSpace](https://dspace.kci.go.kr/handle/kci/2085744?utm_source=chatgpt.com)

### IoT, sensores y prototipos con ESP32

1. **Design of a smart hydroponics monitoring system using an ESP32** (artículos/ScienceDirect / trabajos académicos similares).
    Ejemplos de arquitecturas con ESP32, sensores, comunicación (MQTT/HTTP) y visualización — te da un blueprint reproducible para el firmware y la telemetría. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2215016123003977?utm_source=chatgpt.com)[ResearchGate](https://www.researchgate.net/publication/381245608_Internet_of_Things_IoT_Based_Greenhouse_Monitoring_and_Controlling_System_Using_ESP-32?utm_source=chatgpt.com)
2. **IoT systems & papers (varios en ResearchGate / IJARCCE) que usan ESP32 para invernaderos.**
    Proyectos con código y esquemas que puedes reproducir como base (comprueba calidad/replicabilidad). [Peer-reviewed Journal](https://ijarcce.com/wp-content/uploads/2024/06/IJARCCE.2024.13605.pdf?utm_source=chatgpt.com)[ResearchGate](https://www.researchgate.net/publication/393137522_IoT_System_with_ESP32_for_Smart_Drip_Irrigation_and_Climate_Monitoring_in_Greenhouses?utm_source=chatgpt.com)

### Informes y recursos técnicos

1. **NREL Controlled Environment Agriculture report (documento técnico).**
    Informe técnico con métricas de rendimiento, consumo energético y recomendaciones para diseño a escala. Bueno para la sección de impacto ambiental y modelado energético. [NREL Documents](https://docs.nrel.gov/docs/fy25osti/91081.pdf?utm_source=chatgpt.com)
2. **Artículos recientes sobre LED grow lights y pruebas comparativas (revistas y tests).**
    Útiles para justificar por qué un LED comercial (espectro, PPFD, eficiencia) es mejor/peor que otro. (Ej.: artículos en ScienceDirect y reportes de evaluación). [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2590262824000108?utm_source=chatgpt.com)[Southern Living](https://www.southernliving.com/best-grow-lights-8420703?utm_source=chatgpt.com)

------

## 

1. **Lee 1–4 primero** (revisiones): te dan marco teórico y referencias clave. [MDPI+1](https://www.mdpi.com/2073-4433/13/8/1258?utm_source=chatgpt.com)[PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9919669/?utm_source=chatgpt.com)[ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0308521X23000781?utm_source=chatgpt.com)
2. **Lee 5–6** para elegir la estrategia de control (ON/OFF, histéresis, PID o adaptive). [ResearchGate](https://www.researchgate.net/publication/347267984_Parameter_Self-Tuning_PID_Control_for_Greenhouse_Climate_Control_Problem?utm_source=chatgpt.com)[DSpace](https://dspace.kci.go.kr/handle/kci/2085744?utm_source=chatgpt.com)
3. **Lee 7–8** para la capa práctica (sensores, topologías con ESP32, protocolos IoT). [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2215016123003977?utm_source=chatgpt.com)[ResearchGate](https://www.researchgate.net/publication/381245608_Internet_of_Things_IoT_Based_Greenhouse_Monitoring_and_Controlling_System_Using_ESP-32?utm_source=chatgpt.com)
4. **Apoya la sección ambiental/energética** con el informe NREL y estudios de caso. [NREL Documents](https://docs.nrel.gov/docs/fy25osti/91081.pdf?utm_source=chatgpt.com)

