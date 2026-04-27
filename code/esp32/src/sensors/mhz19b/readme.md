# Módulo DS18B20

## propósito

* Lectura de temperatura externa
* Soporte para múltiples sensores en bus OneWire
* Configuración de resolución y dirección específica
* Modo simulación sin hardware

---

## dependencias

* Arduino
* OneWire
* DallasTemperature

---

## configuración hardware

* Protocolo: OneWire
* Pin de datos: `GPIO 4`
* Resistencia pull-up: `4.7kΩ` entre DQ y `3.3V`
* Alimentación:

  * VCC → `3.3V`
  * GND → `GND`

---

## clases principales

### DS18B20Driver

#### métodos

* `bool begin()`
  Inicializa el sensor.
  Retorna `false` si no detecta dispositivos en el bus.

* `void set_simulation_mode(bool enabled)`
  Activa/desactiva simulación.

* `bool apply_config(const Config& cfg)`
  Aplica configuración validada.

* `Config get_config() const`
  Retorna configuración actual.

* `DS18B20Data read()`
  Retorna una lectura del sensor.

---

## estructura Config

Campos esperados:

* `interval_ms`: intervalo de muestreo
* `simulation`: bool
* `resolution`: [9,10,11,12] bits
* `use_address`: bool
* `address`: array de 8 bytes (ROM code)

### detalles

* `resolution` afecta precisión y tiempo de conversión:

  * 9 bits  → ~93.75 ms
  * 10 bits → ~187.5 ms
  * 11 bits → ~375 ms
  * 12 bits → ~750 ms

* `address` permite seleccionar un sensor específico en el bus

Valores inválidos son rechazados por `validate_config`.

---

## estructura DS18B20Data

* `temperature` (°C)

En error: valor `NAN`

---

## modos de operación

### modo normal

* Usa hardware real
* Requiere `begin()` exitoso
* Lee sensor por índice o dirección

### modo simulación

* Genera datos aleatorios:

  * temperatura: 18–35°C

* No usa OneWire

---

## manejo de errores

* `begin()` falla → no hay dispositivos en el bus
* `read()` falla si:

  * sensor desconectado (`DEVICE_DISCONNECTED_C`)
  * valor fuera de rango (-55°C a 125°C)

* en error → retorna `NAN`
* mensajes por `Serial`

---

## notas

* Soporta múltiples sensores en el mismo bus OneWire
* El uso de `address` es recomendado en entornos con múltiples dispositivos
* La resolución alta (12 bits) aumenta el tiempo de lectura
* No hay reconexión automática del bus OneWire
* La validación de configuración es obligatoria
* El modo simulación permite pruebas sin hardware
