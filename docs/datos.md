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

### 1.2 Vector de estado `x_t` (contrato v1 — decidido)

`x_t` = subconjunto **normalizado** de las métricas anteriores, más contexto temporal.

**Núcleo v1 (decidido)** — es el `dim_x` por defecto de `scripts/build_dataset.js`:

| # | Métrica |
|---|---|
| 1 | `temperature` (aire) |
| 2 | `humidity` |
| 3 | `pressure` |
| 4 | `co2` |
| 5 | `ec` |
| 6 | `vpd` |
| 7 | `dew_point` |
| 8 | `ndvi` |
| 9 | `par` |
| 10 | `ec_compensated` |

El vector es **extensible**: se añaden las demás métricas del catálogo
(`gas_resistance`, `co2_change_rate`, `salinity`, `tds`, `chlorophyll_index`,
`red_edge_ratio`, …) pasándolas por `--metrics` a `build_dataset.js`.

Cada variable debe llevar metadatos: **unidad**, **ventana de normalización**
(media/σ o min-max) y **calidad** (`quality` en `telemetry`).

> **Decisión cerrada (D7):** contrato v1 fijado con las 10 métricas de arriba.
>
> **Decisión cerrada (D2):** la **fuente única** de telemetría es el hypertable
> `telemetry` del backend; la copia en `plant_service` queda como legado a retirar.

### 1.3 Contexto temporal `d_t` (contrato — decidido)

`d_t` son las **perturbaciones/contexto que varían en el tiempo** y que el modelo
recibe junto a `x_t` y `u_t`. En el contrato de `causalTransformer-api` ocupan el
papel de *vitals* (entradas variables en el tiempo que **no** son tratamientos).

| Componente | Forma | Notas |
|---|---|---|
| Hora del día | `sin(h), cos(h)` | 2 valores (codificación cíclica) |
| Día de la semana | `sin(dow), cos(dow)` | 2 valores |

⇒ `dim_d = 4` (por defecto en `scripts/build_dataset.js`).

**Qué NO es `d_t`**

- La **fase** activa es *constante dentro de la ventana* → va en `static_features`
  (contrato causalTransformer). `build_dataset` la emite por muestra en `phase`.
- Los **setpoints** `x*` son la **referencia del coste del MPC**, no contexto del
  modelo. `build_dataset` los emite por muestra en `x_target`.

> **Decisión cerrada (D3):** `d_t` (hora/día) entra por el canal de *vitals*; la fase
> entra por `static_features`.

## 2. Acciones `u_t`

Las acciones son el estado de los 4 canales del relé. Espacio de acciones actual:
**discreto y binario** (`ON`/`OFF` por canal) → 2⁴ = 16 combinaciones por instante.

### 2.1 Situación actual

| Dónde | Qué guarda |
|---|---|
| `actuator_events` | `old_state`, `new_state`, `reason`, `created_at` — permite **reconstruir** `u_t` históricamente |
| `actuators.state` | Último estado conocido por actuador |

`reason` documenta el origen: `api:set` (comando manual) y `mqtt_state_update`
(confirmación del dispositivo). Con `mpc` *(propuesto)* cuando exista el controlador.

### 2.2 Tabla `control_actions` (implementada ✅)

Serie canónica de `u_t`, en `db/init.sql` (hypertable):

```sql
CREATE TABLE IF NOT EXISTS control_actions (
    time        TIMESTAMPTZ NOT NULL,
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    channel     SMALLINT NOT NULL,          -- 1..4
    actuator    TEXT NOT NULL,              -- canal_1..canal_4
    state       TEXT NOT NULL,              -- ON | OFF
    source      TEXT NOT NULL,              -- manual | device | mpc | safety
    setpoint    JSONB,                      -- objetivo que motivó la acción
    reason      TEXT,                       -- explicación / traza
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
SELECT create_hypertable('control_actions', 'time', if_not_exists => TRUE);
```

**Se registra hoy:** al emitir un comando (`source='manual'`) en
`backend/src/actuators/actuators.controller.ts`, y al confirmar el dispositivo
(`source='device'`) en `backend/src/mqtt/mqtt.service.ts`. Incluye
`simulated BOOLEAN` (origen simulado).

Toda acción —incluidas las **manuales** y (a futuro) las **rechazadas** por
safety— queda registrada. Esto da el dataset para entrenar la dinámica y la
trazabilidad (capa 8).

## 3. Setpoints y fases (contexto del objetivo)

`plant-service` define **fases** de cultivo con objetivos (`min`/`target`/`max`)
por variable, y expone el contrato para el dispositivo:

| Endpoint | Contenido |
|---|---|
| `GET /api/v1/device/config` | fase activa + objetivos compactos |
| `GET /api/v1/device/targets` | solo objetivos de la fase activa |
| `GET /api/v1/device/current-phase` | fase activa |
| `POST /api/v1/device/telemetry` | ingesta alternativa de telemetría |

Los setpoints son el **referente del coste del MPC** (`x_target`).

**Histórico de setpoints (implementado ✅).** La tabla
`plant_service.setpoint_snapshots` guarda una instantánea (`valid_from`, fase,
`version`, `targets`) cada vez que cambian los objetivos de la fase activa o la
propia fase activa (idempotente: no duplica si nada cambió):

| Endpoint | Contenido |
|---|---|
| `GET /api/v1/crops/setpoints` | instantánea vigente (o la vigente en `?at=ISO`) |
| `GET /api/v1/crops/setpoints/history?limit=` | lista de instantáneas |

**Validación por unidad (implementada ✅).** Los objetivos con `min`/`target`/`max`
(`RangeTarget`) se validan contra el rango físico de su `unit` (`app/schemas/targets.py`,
`unit_bounds()`): `ppm` admite 0–50000 (CO₂), `°C` −50–100, `%` 0–100, etc. Sin unidad
(o con una unidad desconocida) **no** se aplica cota numérica, solo el orden
`min <= target <= max`. Esto evita que un CO₂ en ppm (400/900/1200) sea rechazado por
un tope genérico pensado para porcentajes. Unidades reconocidas: `°C/°F`, `%`, `ppm/ppb`,
`mS/cm`, `pH`, `hPa/kPa/Pa/bar`, `lux`, `PAR/PPFD`, `µmol/m²/s`, `DLI`, `s/min/h`, `L/L/h`.

**Parámetros informativos por defecto (implementado ✅).** `co2`,
`substrate_temperature`, `ec`, `ph` y `water_level` se marcan como
`informational_only: true` / `controllable: false` **salvo que el payload traiga
los flags explícitos**, sea cual sea la vía de creación (DeepSeek o `PATCH`
manual). Son parámetros que el hardware actual del ESP no garantiza controlar, así
que `compact_targets()` no los envía al dispositivo: el contrato ya no depende de
que el modelo los etiquete. Si el hardware incorpora el actuador, basta con enviar
`controllable: true, informational_only: false`.

## 4. Dataset de entrenamiento

### 4.1 Formato de muestras

El world model aprende `x_t+1 = f(x_t, u_t, d_t)` (`d_t` = perturbaciones/contexto).
El dataset es una colección de **ventanas**:

| Campo | Forma | Descripción |
|---|---|---|
| `x_hist` | `[k, dim_x]` | estado en los `k` pasos previos |
| `u_hist` | `[k, dim_u]` | acciones en los `k` pasos previos |
| `d_hist` | `[k, dim_d]` | contexto temporal (hora + día, §1.3) |
| `y_future` | `[H, dim_x]` | estados futuros a predecir |
| `phase` | `str \| null` | fase activa en `t` → `static_features` |
| `x_target` | objeto \| null | setpoints vigentes en `t` → referencia `x*` del MPC |
| `simulated` | `bool \| null` | origen del dato (simulado/real) |

- **Alineación temporal:** re-muestreo a una cadencia común (p. ej. 1 min), con
  *forward-fill* de acciones y agregación de sensores. La cadencia nativa es
  15–25 s por sensor (ver `readme.md` §10).
- **Base del control:** `x_target` y `phase` se toman de
  `plant_service.setpoint_snapshots` (la instantánea vigente en `t`), así que el
  dataset respeta el histórico de objetivos.
- **Splits:** temporales (train/val/test por bloques de tiempo), nunca aleatorios.
- **Marcado de origen:** cada muestra indica si viene de datos **simulados o reales**.
- **Excitación:** para que `u_t` tenga variación suficiente y la matriz de efecto `E`
  (§`especificacion.md` §4.4) sea aprendible, se usa `scripts/excite.js`

### 4.2 Extracción (implementada ✅)

Script `scripts/build_dataset.js` (Node, sin dependencias nuevas: reutiliza `pg`
de `backend/node_modules`). Re-muestrea por `time_bucket`, pivotea `x_t` y `u_t`,
calcula el contexto `d_t` y emite ventanas en NDJSON:

```bash
node scripts/build_dataset.js \
  --from now-60m --to now \
  --freq 60 --k 12 --h 3 \
  --metrics temperature,humidity,pressure,co2,ec,vpd,dew_point,ndvi,par,ec_compensated \
  --out files/dataset.ndjson
```

Salida: una línea `{"type":"meta", ...}` y una línea por ventana
`{"type":"sample", "t", "x_hist", "u_hist", "d_hist", "y_future"}`.

> **Origen de datos (implementado ✅):** cada payload lleva `simulated` (firmware:
> `config.simulation` del sensor; simulador: siempre `true`); se persiste en
> `telemetry.simulated` y `control_actions.simulated`, y `build_dataset` resume
> `data_source` (`simulated` | `real` | `mixed` | `unknown`) más `simulated` por ventana.

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
| Sensores en simulación | Flag `simulated` en `telemetry`/`control_actions` (implementado) |
| Escalas distintas | Normalización por variable (z-score / min-max) |

## 7. Advertencia sobre datos simulados

Hoy el firmware no encuentra los sensores físicos y activa **simulación**
(ver la salida serie: `BME680 ... activando simulación`, idem AS7341, MH-Z19B,
Soil EC). Los valores que hoy llegan a `telemetry` son **sintéticos**. Cualquier
modelo entrenado con estos datos **no será válido** para el cultivo real hasta
conectar los sensores o etiquetar los datos como simulados.
