# Módulo BH1750

## propósito

* Lectura de iluminancia (lux)
* Configuración de intervalo de muestreo
* Modo simulación sin hardware

---

## dependencias

* Arduino  
* Wire (I2C)  
* BH1750 (librería claws)

---

## configuración hardware

* Dirección I2C: `0x23`  
* SDA: `GPIO 21`  
* SCL: `GPIO 22`  

---

## clases principales

### BH1750Driver

#### métodos

* `bool begin()`  
  Inicializa el sensor.  
  Retorna `false` si no detecta el hardware.

* `void set_simulation_mode(bool enabled)`  
  Activa/desactiva simulación.

* `bool apply_config(const Config& cfg)`  
  Aplica configuración validada.

* `Config get_config() const`  
  Retorna configuración actual.

* `BH1750Data read()`  
  Retorna una lectura del sensor.

* `bool is_ready() const`  
  Indica si el hardware está disponible.

---

## estructura Config

Campos esperados:

* `interval_ms`: intervalo de muestreo en milisegundos  
  *mín*: 1000  
  *máx*: 3600000  

* `simulation`: bool  

Valores inválidos son rechazados por `validate_config`.

---

## estructura BH1750Data

* `illuminance` (lux)

En error: `NAN`

---

## modos de operación

### modo normal

* Usa hardware real
* Requiere `begin()` exitoso
* Lectura vía I2C

---

### modo simulación

* Genera datos aleatorios:
  * iluminancia: 100–10000 lux
* No usa I2C

## manejo de errores

* `begin()` falla → hardware no detectado
* `read()` falla → retorna `NAN`
* `apply_config()` con valores inválidos → retorna `false`
* configuración inválida en NVS → se reemplaza por valores por defecto
* error en publicación MQTT → se registra por `Serial`
* mensajes de diagnóstico vía `Serial`

## Notas

* No hay reconexión automática del bus I2C.  
* El sensor opera en modo continuo de alta resolución.  
* El intervalo de muestreo se controla externamente (por `sensor_manager`).  
* El modo simulación evita inicializar hardware.  
* `read()` nunca bloquea; retorna dato o `NAN`.  
* `begin()` no reintenta automáticamente si falla.  
* El sistema depende de la validez de `Config` para operar correctamente.  
