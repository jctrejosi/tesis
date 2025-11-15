## 1 Requerimientos

- Caja con **1 entrada** (enchufe/toma) para alimentación (red o inversor/batería).
- **8 salidas** (enchufes) independientes, cada una con control ON/OFF programable por ESP32.
- Cada puerto con **fusible** y **LED indicador**.
- Control por **ESP32** (Wi-Fi), con entradas físicas (botones) por puerto (override manual).
- Soporte futuro para sensores (se conectan aparte; no integrados en etapa 1).
- Fácil ampliación (más canales o control por MQTT/HTTP).

------

# 2 — Topología eléctrica (visión general)

- **Entrada AC (110 V)** → interruptor principal → **fusible principal** → distribución a 8 líneas de salida vía **fusible por canal** → cada canal pasa por **Relé/SSR** (serie en la FASE) → salida a tomacorriente.
- **NEUTRO**: va directo a cada tomacorriente (no conmutar).
- **TIERRA**: a chasis y tomacorrientes.
- **Fuente 5 V (o 12 V según módulos)** aislada → alimenta ESP32 y lógica.
- **GND común** entre ESP32 y módulos que lo requieran (no mezclar con tierra de red salvo en puntos de referencia).
- **Separación física** AC/DC en la caja.

Esquema por canal (repetir 8 veces):

```
FASE(L) ─ Fusible canal ─ COM(relé/SSR) ─ NO(relé/SSR) ─→ Fase toma_i
NEUTRO ───────────────────────────────────────────────→ Neutro toma_i
TIERRA ───────────────────────────────────────────────→ Tierra toma_i
```

Control lógico:

```
ESP32 GPIO_i -> driver/opto -> IN(relé/SSR_i)
ESP32 5V -> VCC driver
ESP32 GND -> GND driver (si aplica)
LED indicador_i -> GPIO (o 5V via resistor)
Botón override_i -> GPIO con pull-up/pull-down
```

------

# 3 — Selección de módulos por canal (recomendado)

- **Para bombillos LED / cargas resistivas**: **SSR AC zero-cross** (entrada 3–32 V DC), **corriente nominal 25–40 A** (coloca disipador).
  - Ventaja: silencioso, larga vida, sin chispas.
  - Inconveniente: para cargas inductivas/ motores, mejor relé mecánico o SSR random-fire.
- **Para ventiladores/motores (si los vas a conectar)**: **Relé mecánico 10–16 A** (módulo optoaislado) y **snubber RC** en paralelo a la carga; o SSR random-fire específico.
- **Recomendación práctica para MVP**: usar **relé mecánico de 16 A por canal** (más barato) o **SSR 25 A** si la mayoría serán bombillos LED. Si no conoces la carga final, usa relés 16 A (soportan más tipos de carga).

------

# 4 — Fuente / alimentación dual (red y batería)

Tú quieres una PowerBox que acepte **entrada desde red o desde batería**. Opciones:

### A) Opción simple — usar **un solo punto de entrada AC**:

- Enchufe de entrada: toma de pared. Si conectas un inversor de batería (110 V AC salida), la PowerBox no distingue entre origen (red o inversor).
- **Requisito:** que el inversor suministre onda senoidal pura o modificada compatible con cargas (LEDs pueden fallar con onda modificada).
- **Ventaja:** simple: la caja recibe 110 V AC y distribuye a salidas tras relés.
- **Desventaja:** no gestiona conmutación automática entre red y batería (si la quieres, ver Opción B).

### B) Opción avanzada — entrada dual (Grid + Inverter/Battery) con **transfer relay**:

- Implementa un **transfer switch** (manual o automática) que seleccione la fuente (red o inversor). Puede ser:
  - **Manual**: selector mecánico 2 posiciones (GAS/INV).
  - **Automático (ATS)**: relé contactor + detección de red; si red falla, conmuta a inversor.
- Recomendado si quieres operación sin supervisión y protección de baterías.

Para la **Etapa 1** yo recomiendo **Opción A** (entrada simple) y, si luego quieres baterías/inversor, integras un ATS.

------

# 5 — Protección y seguridad (obligatorio)

- **Fusible principal** (por ejemplo 10 A) y **fusible por canal** (2–5 A según carga esperada).
- **Interruptor general** (mecánico) para desconectar la caja.
- **Prensaestopas** en entradas/salidas AC.
- **Distancias de fuga** y aislamiento entre AC y DC.
- **Tierra a chasis** y tomas.
- **Etiquetado** por canal (corriente máx, propósito).
- **Protector de sobretensión (MOV)** en entrada.
- **GFCI** ideal en la entrada si se trabaja en ambientes húmedos.
- **Ventilación** adecuada si usas SSR con disipador.

------

# 6 — Electrónica de control (ESP32 + drivers)

- **ESP32 DevKit v1** (1 unidad).
- **Expander de I/O** (opcional si quieres liberar pines): **PCF8574 / MCP23017** por I2C para más entradas/salidas. Con 8 canales puedes usar pines directos, pero si más adelante agregas relés, mejor I/O expander.
- **Driver/opto**: si usas relé mecánico que requiere 5 V, emplea optoacoplador o transistor para aislar GPIO. Si usas SSR con entrada 3–32 V, conecta GPIO vía resistor (o transistor si entrada SSR exige >3.3 V).
- **Botones & LEDs**: un botón y un LED por canal para override e indicador.

------

# 7 — Hardware físico y BOM orientativo (2 alternativas: económico / profesional)

### Componentes clave (base 8 canales)

- Caja ABS ignífuga con separador AC/DC.
- IEC C14 inlet (entrada AC) + cable.
- Fusible principal + portafusible.
- MOV 275 V o equivalente.
- 8 × Fusible canal (1–5 A) + portafusibles.
- 8 × Relé mecánico 16 A (módulo optoaislado) **o** 8 × SSR AC 25–40 A + disipador.
- 8 × Tomacorrientes panel-mount (tipo local).
- 1 × ESP32 DevKit v1.
- 1 × Fuente 5 V/3 A (aislada) para ESP32 y LEDs.
- Borneras, cables (AWG14/16 para AC), prensaestopas, bornes PE.
- 8 × LED indicadores + resistencias, 8 × botones.
- Tornillería, separadores, placa base de montaje.

### Estimación de precios (aprox)

- Relés 16 A (módulo) ×8: USD 3–6 c/u → USD 24–48.
- SSR 25 A ×8: USD 10–20 c/u → USD 80–160 (más disipador).
- ESP32: USD 10.
- Fuente 5 V/3 A: USD 8–15.
- Tomas, fusibles, borneras, caja: USD 60–120.
- Total aprox MVP (relés mecánicos): **USD 150–250**. (Varía según calidad y país).

------

# 8 — Firmware y control lógico (básico)

- **Modo seguro al boot**: todas las salidas OFF.
- **Control por canal**: API REST simple o MQTT topic por puerto `powerbox/channel/1/set {on|off}`.
- **Override físico**: pulsador por canal con debounce; al presionar cambia estado local y publica estado por MQTT.
- **Scheduler local**: fotoperiodos y reglas simples (ON/OFF por tiempo).
- **Watchdog** y detección de fallos de relé (leer estado si módulo tiene feedback) opcional.
- **OTA** para updates.

------

# 9 — Montaje y pruebas (pasos rápidos)

1. Compra y organiza partes.
2. Monta la fuente 5 V y ESP32 en compartimento aislado.
3. Fija relés/SSR y tomas en la placa interior; cablea fase vía fusibles → relé → toma. Neutro directo. Tierra al chasis.
4. Instala LEDs y botones, cableados a ESP32 con resistencias/pullups.
5. Prueba lógica en banco (sin AC): toggling GPIO activa LEDs y señales de control (medir salidas IN de relé).
6. Conecta AC con fusible y realiza pruebas una salida a la vez con carga de prueba (lámpara incandescente o lámpara de bajo consumo) — con fusible presente y GFCI si posible.
7. Pruebas de 24 h y registro de temperatura en relés/SSR.
8. Documenta, toma fotos y mide consumos.

------

# 10 — Extensión futura (rápida)

- Añadir **transfer switch automático** para conmutar red↔batería.
- Integrar medidor de energía por canal (modulo ACS712 o mejor: medidor de energía basado en chip dedicado) para control y dimensionamiento solar.
- Añadir **I/O expander** para más canales.
- Añadir **web UI / Mobile** y reglas complejas.

------

# 11 — Checklist imprimible (resumido)

-  Caja con separador AC/DC instalada.
-  Entrada AC y fusible principal instalada.
-  8 tomas instaladas y cableadas.
-  8 relés/SSR instalados con disipadores si aplica.
-  Fuente 5 V instalada y cableada a ESP32.
-  Botones + LEDs instalados.
-  Conexión a tierra y pruebas de continuidad.
-  Prueba en banco (sin AC) del control lógico.
-  Prueba con carga (1 canal a la vez).
-  Prueba 24 h y registro térmico/consumo.