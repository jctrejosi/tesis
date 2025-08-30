# README — MVP: Control de bombillo con ESP32

Documento técnico corto: checklist, BOM básico (con estimaciones de precio) y explicación de cada componente. Directo y sin rodeos.

------

## Resumen objetivo

Montar un MVP seguro que permita controlar un bombillo (ON/OFF) desde una **ESP32** usando **SSR** o **módulo relé**, con sensor de temperatura/humedad mínimo para pruebas posteriores.

------

## BOM básico (mínimo para la prueba)

| Item                                                         | Cantidad           | Rango precio (USD)            | Est. precio COP (referencia: multiplicar por ~4,000) | Propósito / notas                                            |
| ------------------------------------------------------------ | ------------------ | ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| ESP32 DevKit (DOIT o similar)                                | 1                  | 8 – 18                        | 32.000 – 72.000                                      | Microcontrolador con Wi-Fi/Bluetooth; ejecuta firmware y controla relé/SSR. |
| SSR AC 10 A (módulo) **o** Módulo relé 1–2 canales 10 A optoaislado | 1 (o 1 módulo 2ch) | SSR: 8 – 20; Relé: 3 – 10     | 32.000 – 80.000 ; 12.000 – 40.000                    | Conmuta la carga AC (bombillo). SSR recomendado para LED/ruido y durabilidad; relé mecánico más barato. |
| Fuente USB 5 V 2 A (cargador) + cable USB                    | 1                  | 4 – 10                        | 16.000 – 40.000                                      | Alimenta la ESP32 de forma estable.                          |
| Sensor T/H básico (DHT22) **o** SHT31                        | 1                  | DHT22: 4 – 10; SHT31: 10 – 20 | 16.000 – 80.000                                      | Lectura temperatura y humedad; SHT31 es más precisa/estable. |
| Fusible en línea + portafusible                              | 1                  | 1 – 5                         | 4.000 – 20.000                                       | Protección primaria en la fase AC (elige valor acorde a carga). |
| Cables AC (fase, neutro) y borneras                          | -                  | 3 – 10                        | 12.000 – 40.000                                      | Conexiones seguras; seccionado según corriente esperada.     |
| Caja plástica con prensaestopas                              | 1                  | 5 – 20                        | 20.000 – 80.000                                      | Aislante, organiza AC/DC y protege conexiones.               |
| Multímetro (si no tienes)                                    | 1                  | 8 – 40                        | 32.000 – 160.000                                     | Verificar continuidad, voltajes, corrientes.                 |
| Bombillo de prueba (tu LED)                                  | 1                  | 0 – 8                         | 0 – 32.000                                           | Carga a controlar; si no, usar bombilla incandescente baja tensión para pruebas. |
| Snubber RC (si usas relé con cargas inductivas)              | 1                  | 1 – 5                         | 4.000 – 20.000                                       | Reduce picos EMI cuando usas relés mecánicos con motores/extractores. |
| Opcional: Interruptor diferencial (GFCI) o toma protegida    | 1                  | 15 – 50                       | 60.000 – 200.000                                     | Seguridad adicional de la instalación eléctrica (recomendado). |

**Estimado total MVP (USD):** ~35 – 150 (dependiendo SSR vs relé, sensor, multímetro, y protecciones).
 **Estimado total MVP (COP aprox):** ~140.000 – 600.000 (usa tasa local para conversión exacta).

------

## Checklist de compra (prioridad)

1. ESP32 DevKit.
2. SSR AC 10 A **(si puedes, elegir SSR; si no, relé optoaislado 10 A)**.
3. Fuente USB 5 V 2 A + cable.
4. Sensor T/H (DHT22 para barato; SHT31 preferido).
5. Fusible + portafusible.
6. Cables AC adecuados, borneras, prensaestopas.
7. Caja plástica (separar compartimentos AC/DC).
8. Multímetro.
9. Snubber RC (si optas por relé mecánico).
10. Opcional: GFCI/interruptor diferencial.

------

## Checklist de armado y pruebas (pasos ordenados; seguir estrictamente)

**Seguridad primero:** corta la alimentación antes de tocar la red. Usa multímetro para verificar.

1. **Inspección previa de componentes:** revisar pines, polaridades, roturas físicas.
2. **Montaje DC en banco (sin AC):**
   - Conectar ESP32 a la fuente USB.
   - Conectar IN del SSR/relé al GPIO seleccionado (ej. GPIO25).
   - Conectar GND común entre ESP32 y módulo de relé si el módulo lo requiere.
   - Verificar que al activar GPIO el LED del módulo cambia. *(Si no, revisar ACTIVE LOW/HIGH y cableado.)*
3. **Probar sensor T/H (sin AC):**
   - Conectar sensor a 3.3 V/GND/SDA-SCL o data pin.
   - Subir sketch de ejemplo; leer valores por Serial y confirmar lecturas razonables.
4. **Montaje físico AC (con fusible instalado) — revisar aislamiento:**
   - Interruptor general y fusible en la fase antes del relé.
   - Conectar Fase → fusible → COM_relé/SSR → NO_relé → fase del bombillo.
   - Neutro del circuito directo al bombillo.
   - Asegurar prensaestopas y separación entre AC y DC.
5. **Prueba con carga real (corta duración):**
   - Con fusible y protección diferencial (si disponible), energizar circuito.
   - Hacer conmutaciones cortas (ej. 3–5 s) y observar: SSR/relé, bombillo, y que ESP32 no resetea.
   - Medir corriente con multímetro para confirmar dimensionamiento de fusible/SSR.
6. **Prueba de robustez (24 h):**
   - Ejecutar fotoperiodo simple (ej. 12/12 con la lógica del sketch).
   - Revisar temperatura del SSR/relé y conexiones; si algo se calienta en exceso, corregir (disipador, mejor módulo, sección de cables).
7. **Validación del sensor y control:**
   - Forzar condiciones (calor cerca del sensor, pulverizar agua por seguridad) y verificar que lógica de fail/histéresis actúa correctamente (p.ej. extractor ON si RH alta).
8. **Registro y telemetría (si aplica):**
   - Una vez estable, añadir conexión Wi-Fi + NTP/MQTT para fotoperiodo por hora real y registro remoto.

------

## BOM: para qué sirve cada componente (explicación breve)

- **ESP32:** cerebro del sistema; lee sensores y activa relé/SSR; permite conectividad y expansión.
- **SSR AC / Relé optoaislado:** actúa como interruptor controlado por ESP32 para la carga AC. SSR = estado sólido, sin contactos mecánicos. Relé = contactos mecánicos.
- **Fuente USB 5 V:** alimenta ESP32; debe ser estable para evitar resets al conmutar cargas.
- **Sensor T/H (DHT22 / SHT31):** mide temperatura y humedad; permite lógica de ventilación y condiciones.
- **Fusible/portafusible:** protección frente a sobrecorrientes y cortocircuitos en la fase.
- **Cables AC y borneras:** conexiones seguras y resistentes a la corriente.
- **Caja + prensaestopas:** evita contactos accidentales y protege montaje.
- **Multímetro:** herramienta de verificación eléctrica imprescindible.
- **Snubber RC:** protege contra picos generados por cargas inductivas al conmutar con relés mecánicos.
- **GFCI / diferencial:** protege a la persona frente a fugas y reduce riesgo de choque eléctrico.

------

## Recomendaciones prácticas y errores comunes

- **No uses protoboard para la parte AC.** Prototipado AC en protoboard = peligro.
- **Separar alimentación del módulo relé** si al conmutar el relé el ESP32 se reinicia (problema de ruido/caída). Aísla alimentación o añade diodos/condensadores de desacoplo.
- **Verifica si el SSR acepta 3.3 V en su entrada.** Algunos SSR esperan señal de 5 V; si es así, necesitas un transistor o optoacoplador intermedio.
- **Confirma si el módulo relé es ACTIVE LOW** (la mayoría) para ajustar el firmware.
- **Dimensiona bien fusible y cableado** según la potencia de la carga real (usa I = P/V).
- **Documenta todo**: fotos, esquemas, valores medidos; te servirán para la tesis.

------

## Firmware mínimo (recordatorio)

- Fail-safe: al arrancar, **todos OFF**.
- No uses `delay()` en la versión final—usar `millis()` y estados.
- Añade watchdog o supervisor para evitar fallos que dejen la carga en estado inseguro.

------

## Entregables que puedo generar ahora (si quieres)

- README listo (este).
- **Diagrama eléctrico** (Draw.io) con pines y conexiones AC/DC.
- **Checklist imprimible** en formato Markdown/PDF para taller.
- **Sketch Arduino** con fotoperiodo por millis y control de histéresis ya comentado.

Dime cuál de esos quieres que prepare ahora (diagrama eléctrico, checklist imprimible o sketch listo para copiar).

##### 