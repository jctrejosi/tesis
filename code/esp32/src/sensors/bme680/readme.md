# Módulo BME680

## propósito

* Lectura de temperatura, humedad, presión y gas
* Configuración dinámica de oversampling y filtro
* Modo simulación sin hardware

---

## dependencias

* Arduino
* Wire (I2C)
* Adafruit_BME680

---

## configuración hardware

* Dirección I2C: `0x76`
* SDA: `GPIO 21`
* SCL: `GPIO 22`

---

## clases principales

### BME680Driver

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

* `BME680Data read()`
  Retorna una lectura del sensor.

---

## estructura Config

Campos esperados:

* `temp_oversample`: [0,1,2,4,8,16]
* `hum_oversample`: [0,1,2,4,8,16]
* `press_oversample`: [0,1,2,4,8,16]
* `iir_filter`: [0,1,3,7,15,31,63,127]
* `gas_heater_temp`: temperatura del heater
* `gas_heater_duration`: duración en ms
* `simulation`: bool

Valores inválidos son rechazados por `validate_config`.

---

## estructura BME680Data

* `temperature` (°C)
* `humidity` (%)
* `pressure` (hPa)
* `gas_resistance` (Ohms)

En error: valores `NAN`

---

## modos de operación

### modo normal

* Usa hardware real
* Requiere `begin()` exitoso

### modo simulación

* Genera datos aleatorios:

  * temperatura: 22–32°C
  * humedad: 40–80%
  * presión: 990–1030 hPa
* No usa I2C

---

## flujo recomendado

```cpp
BME680Driver sensor;

void setup() {
    Serial.begin(115200);

    if (!sensor.begin()) {
        // fallback a simulación
        sensor.set_simulation_mode(true);
    }
}

void loop() {
    auto data = sensor.read();

    if (!isnan(data.temperature)) {
        Serial.println(data.temperature);
    }

    delay(2000);
}
```

---

## manejo de errores

* `begin()` falla → hardware no detectado
* `read()` falla → retorna `NAN`
* mensajes por `Serial`

---

## notas

* El módulo no maneja reconexión automática I2C
* La validación de configuración es obligatoria
* El modo simulación es útil para pruebas sin sensor
