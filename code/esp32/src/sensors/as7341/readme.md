# Módulo AS7341

## propósito

* Lectura espectral multicanal
* Medición de intensidad relativa por bandas de longitud de onda
* Configuración de parámetros de integración y ganancia
* Control opcional del LED integrado
* Modo simulación sin hardware

---

## dependencias

* Arduino
* Wire (I2C)
* Adafruit AS7341

---

## configuración hardware

* Dirección I2C: `0x39`
* SDA: `GPIO 21`
* SCL: `GPIO 22`

---

## clases principales

### AS7341Driver

#### métodos

* `bool begin()`

  Inicializa el sensor.

  Retorna `false` si no detecta el hardware.

* `void set_simulation_mode(bool enabled)`

  Activa/desactiva simulación.

* `bool apply_config(const Config& cfg)`

  Valida y aplica configuración.

* `Config get_config() const`

  Retorna configuración actual.

* `AS7341Data read()`

  Realiza una lectura espectral completa.

* `bool is_ready() const`

  Indica si el hardware está disponible.

---

## estructura Config

Campos esperados:

### framework

* `interval_ms`

  Intervalo de muestreo en milisegundos.

  *mín*: 1000

  *máx*: 3600000

* `simulation`

  Activa modo simulación.

---

### configuración espectral

* `atime`

  Tiempo de integración base.

  *mín*: 0

  *máx*: 255

* `astep`

  Resolución de integración.

  *mín*: 0

  *máx*: 65534

* `gain`

  Ganancia analógica.

  Valores permitidos:

```text
1
2
4
8
16
32
64
128
256
512
```

---

### iluminación integrada

* `led_enabled`

  Habilita LED integrado del sensor.

* `led_current_ma`

  Corriente del LED.

  *mín*: 0

  *máx*: 100 mA

---

## estructura AS7341Data

Canales espectrales disponibles:

* `f1_415nm`
* `f2_445nm`
* `f3_480nm`
* `f4_515nm`
* `f5_555nm`
* `f6_590nm`
* `f7_630nm`
* `f8_680nm`

Canales auxiliares:

* `clear`
* `nir`

Todos los valores corresponden a cuentas digitales entregadas por el sensor.

---

## significado de los canales

| Canal | Longitud de onda aproximada |
| ----- | --------------------------- |
| f1    | 415 nm                      |
| f2    | 445 nm                      |
| f3    | 480 nm                      |
| f4    | 515 nm                      |
| f5    | 555 nm                      |
| f6    | 590 nm                      |
| f7    | 630 nm                      |
| f8    | 680 nm                      |
| clear | espectro visible sin filtro |
| nir   | infrarrojo cercano          |

---

## modos de operación

### modo normal

* Usa hardware real
* Requiere `begin()` exitoso
* Comunicación I2C
* Aplica configuración de integración y ganancia

---

### modo simulación

Genera datos aleatorios:

* f1–f8: 100–5000
* clear: 1000–15000
* nir: 100–5000

No utiliza hardware ni bus I2C.

---

## MQTT

### lectura inmediata

Topic:

```text
growbox/as7341/read
```

Solicita una lectura inmediata del sensor.

---

### configuración

Topic:

```text
growbox/as7341/config
```

Payload ejemplo:

```json
{
  "interval_ms": 5000,
  "simulation": false,
  "atime": 29,
  "astep": 599,
  "gain": 128,
  "led_enabled": true,
  "led_current_ma": 20
}
```

---

### publicación de datos

Topic:

```text
growbox/as7341/data
```

Payload ejemplo:

```json
{
  "f1_415nm": 1200,
  "f2_445nm": 1320,
  "f3_480nm": 1450,
  "f4_515nm": 1710,
  "f5_555nm": 1880,
  "f6_590nm": 1650,
  "f7_630nm": 1420,
  "f8_680nm": 1190,
  "clear": 6500,
  "nir": 980
}
```

---

## manejo de errores

* `begin()` falla → hardware no detectado
* `readAllChannels()` falla → lectura inválida
* `apply_config()` con parámetros inválidos → retorna `false`
* configuración inválida almacenada en NVS → se reemplaza por valores por defecto
* error en publicación MQTT → se registra por `Serial`
* mensajes de diagnóstico vía `Serial`

---

## notas

* El sensor utiliza comunicación I2C.
* La dirección I2C por defecto es `0x39`.
* El intervalo de muestreo se controla externamente mediante `sensor_manager`.
* La ganancia y el tiempo de integración afectan directamente la sensibilidad de la medición.
* El LED integrado puede utilizarse como fuente de iluminación controlada.
* Los valores publicados son cuentas espectrales crudas entregadas por el AS7341.
* El cálculo de PAR, PPFD o métricas agronómicas derivadas debe realizarse externamente.
* El modo simulación evita inicializar hardware.
* `begin()` no realiza reintentos automáticos.
* El sistema depende de la validez de `Config` para operar correctamente.
