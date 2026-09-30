# Modelo de datos: estado, acciones y dataset

Define **qué es `x_t`**, **qué es `u_t`**, cómo entran los setpoints del cultivo y
cómo se materializa el dataset que alimenta al *world model*. Es el prerrequisito
de todo lo demás: **sin `u_t` no hay dinámica que aprender**.

## 1. Estado `x_t`

El estado es el vector de magnitudes que describe el ambiente del cultivo en un
instante. Se construye a partir de la telemetría cruda + las métricas derivadas.

### 1.1 Catálogo de métricas disponibles

Métricas crudas y derivadas que hoy se persisten en `telemetry`
(`metric_name` → unidad aproximada):

| Grupo | Métricas | Fuente |
|---|---|---|
| Ambiente | `temperature`, `humidity`, `pressure`, `gas_resistance` | `bme680` |
| Ambiente derivado | `vpd`, `dew_point`, `altitude` | fórmulas `bme680` |
| Aire | `co2` | `mhz19b` |
| Aire derivado | `co2_change_rate` | fórmula `mhz19b` |
| Suelo | `ec`, `temperature` (suelo) | `soil_ec` |
| Suelo derivado | `ec_compensated`, `salinity`, `tds` | fórmulas `soil_ec` |
| Espectro | `f1_415nm`, `f2_445nm`, `f3_480nm`, `f4_515nm`, `f5_555nm`, `f6_590nm`, `f7_630nm`, `f8_680nm`, `clear`, `nir` | `as7341` |
| Espectro derivado | `ndvi`, `par`, `chlorophyll_index`, `red_edge_ratio`, `nir_reflectance`, `clear_par_ratio`, `lux_estimado` | fórmulas `as7341` |

> Se puede consultar en vivo: `GET /Derivates/:alias/:metricName` y
> `GET /telemetry/:alias/readings`.

### 1.2 Vector de estado propuesto

`x_t` = concatenación de un subconjunto **normalizado** de las métricas anteriores,
más contexto temporal. Propuesta inicial (agrupada, para revisar):

| Bloque | Variables |
|---|---|
| Clima interno | `temperature`, `humidity`, `vpd`, `dew_point`, `pressure` |
| Calidad de aire | `co2`, `gas_resistance`, `co2_change_rate` |
| Suelo / riego | `ec_compensated`, `temperature_suelo`, `salinity`, `tds` |
| Luz | `par`, `ndvi`, `chlorophyll_index`, `red_edge_ratio` |
| Contexto | hora del día (senoidal), fase activa (one-hot) |

Cada variable debe llevar metadatos: **unidad**, **ventana de normalización**
(media/σ o min-max) y **calidad** (`quality` en `telemetry`).

> **Decisión pendiente (A3):** fuente única de verdad para `x_t`. Hoy la
> telemetría vive en dos lugares (backend `telemetry` y `plant_service`).

## 2. Acciones `u_t`

Las acciones son el estado de los 4 canales del relé. Espacio de acciones actual:
**discreto y binario** (`ON`/`OFF` por canal) → 2⁴ = 16 combinaciones por instante.

### 2.1 Situación actual

| Dónde | Qué guarda |
|---|---|
| `actuator_events` | `old_state`, `new_state`, `reason`, `created_at` — permite **reconstruir** `u_t` históricamente |
| `actuators.state` | Último estado conocido por actuador |

`reason` documenta el origen: `manual`, `mqtt_state_update`, `mpc` *(propuesto)*.

### 2.2 Tabla propuesta `control_actions`

Para no depender de reconstrucciones frágiles, se propone una tabla explícita:

```sql
-- PROPUESTO (no existe aún)
CREATE TABLE control_actions (
    time        TIMESTAMPTZ NOT NULL,
    device_id   BIGINT NOT NULL REFERENCES devices(id),
    channel     SMALLINT NOT NULL,          -- 1..4
    actuator    TEXT NOT NULL,              -- canal_1..canal_4
    state       TEXT NOT NULL,              -- ON | OFF
    source      TEXT NOT NULL,              -- manual | mpc | plant | safety
    setpoint    JSONB,                      -- objetivo que motivó la acción
    reason      TEXT,                       -- explicación / traza
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT create_hypertable('control_actions', 'time', if_not_exists => TRUE);
```

Toda acción —incluidas las **manuales** y las **rechazadas** por safety— debe
registrarse. Esto da el dataset para entrenar la dinámica y la trazabilidad (capa 8).

## 3. Setpoints y fases (contexto del objetivo)

`plant-service` define **fases** de cultivo con objetivos (`min`/`target`/`max`)
por variable, y expone el contrato para el dispositivo:

| Endpoint | Contenido |
|---|---|
| `GET /api/v1/device/config` | fase activa + objetivos compactos |
| `GET /api/v1/device/targets` | solo objetivos de la fase activa |
| `GET /api/v1/device/current-phase` | fase activa |
| `POST /api/v1/device/telemetry` | ingesta alternativa de telemetría |

Los setpoints son el **referente del coste del MPC** (`x_target`). Deben quedar
versionados en el tiempo: cuando cambia la fase, el histórico de setpoints debe
poder reconstruirse (hoy `CropPhase.targets` guarda el valor actual, no la serie).

## 4. Dataset de entrenamiento

### 4.1 Formato de muestras

El world model aprende `x_t+1 = f(x_t, u_t, d_t)` (`d_t` = perturbaciones/contexto).
El dataset es una colección de **ventanas**:

| Campo | Forma | Descripción |
|---|---|---|
| `x_hist` | `[k, dim_x]` | estado en los `k` pasos previos |
| `u_hist` | `[k, dim_u]` | acciones en los `k` pasos previos |
| `d_hist` | `[k, dim_d]` | contexto (hora, fase) |
| `y_future` | `[H, dim_x]` | estados futuros a predecir |

- **Alineación temporal:** re-muestreo a una cadencia común (p. ej. 1 min), con
  *forward-fill* de acciones y agregación de sensores. La cadencia nativa es
  15–25 s por sensor (ver `readme.md` §10).
- **Splits:** temporales (train/val/test por bloques de tiempo), nunca aleatorios.
- **Marcado de origen:** cada muestra indica si viene de datos **simulados o reales**.

### 4.2 Extracción

Se implementará como **script/servicio**, no manualmente (ver `roadmap.md` Fase 0):

```
tesis/scripts/  (propuesto)
└── build_dataset.{py,sql}   # ventana -> tensores x_hist, u_hist, d_hist, y_future
```

## 5. Versionado y trazabilidad

- **Modelos:** cada artefacto entrenado lleva `version`, `fecha`, `dataset_hash`,
  hyperparámetros y métricas (ver `observabilidad-aprendizaje.md`).
- **Predicciones:** se registran por horizonte para medir error en vivo.
- **Decisiones:** cada acción del MPC se guarda con su evaluación (coste, restricciones).

## 6. Calidad de datos

| Problema | Tratamiento propuesto |
|---|---|
| Outliers (p. ej. picos de `co2` en simulación) | Filtro + flag `quality` (ya existe la columna) |
| Huecos por reconexión MQTT | Imputación + máscara; corregir keepalive en firmware |
| Sensores en simulación | Flag explícito; excluir de entrenamiento "real" |
| Escalas distintas | Normalización por variable (z-score / min-max) |

## 7. Advertencia sobre datos simulados

Hoy el firmware no encuentra los sensores físicos y activa **simulación**
(ver la salida serie: `BME680 ... activando simulación`, idem AS7341, MH-Z19B,
Soil EC). Los valores que hoy llegan a `telemetry` son **sintéticos**. Cualquier
modelo entrenado con estos datos **no será válido** para el cultivo real hasta
conectar los sensores o etiquetar los datos como simulados.
