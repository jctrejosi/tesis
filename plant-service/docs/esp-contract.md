# Contrato de comunicación ESP ↔ plant-service

El ESP (o cualquier microcontrolador con HTTP) consume la configuración del
cultivo desde plant-service y envía sus mediciones. El contrato es HTTP/JSON
simple, sin acoplamiento a un modelo concreto de placa.

- Base URL: `http://<host>:8000/api/v1`
- Auth: header `X-API-Key: <DEVICE_API_KEY>` (clave compartida, ver `.env`)
- `Content-Type: application/json`

## 1. Obtener la configuración completa

```http
GET /api/v1/device/config
X-API-Key: <DEVICE_API_KEY>
```

Respuesta (compacta, pensada para el microcontrolador):

```json
{
  "protocol_version": 1,
  "device_type": "growbox",
  "current_phase": "vegetativa",
  "crop": "Tomates del invernadero 1",
  "version": "a1b2c3d4e5f60718",
  "updated_at": "2026-08-14T10:00:00Z",
  "targets": {
    "temperature":   { "min": 20, "target": 24, "max": 28, "unit": "°C" },
    "humidity":      { "min": 55, "target": 65, "max": 75, "unit": "%HR" },
    "soil_moisture": { "min": 40, "target": 60, "max": 75, "unit": "%" },
    "lighting":      { "enabled": true, "hours_on": 16, "hours_off": 8, "intensity_target": 500, "unit": "µmol/m²/s" },
    "ventilation":   { "min": 30, "target": 50, "max": 70, "unit": "%" },
    "extraction":    { "min": 20, "target": 30, "max": 60, "unit": "%" },
    "irrigation":    { "threshold": 40, "duration_seconds": 20, "min_interval_hours": 8, "unit": "%" }
  }
}
```

Reglas del payload:

- Solo incluye parámetros **accionables** (`controllable: true` y no
  informativos). Los parámetros `informational_only` (CO₂, pH, EC…) no viajan
  aquí y pueden consultarse en la interfaz web.
- Los campos con valor nulo se omiten; la presencia de `lighting.enabled`
  indica si el fotoperiodo está activo.
- Parámetros personalizados (`custom`) viajan bajo `targets.custom` cuando son
  accionables.

## 2. Solo objetivos (payload más corto)

```http
GET /api/v1/device/targets
```

```json
{
  "phase": "vegetativa",
  "crop": "Tomates del invernadero 1",
  "version": "a1b2c3d4e5f60718",
  "updated_at": "2026-08-14T10:00:00Z",
  "targets": { "...": "igual que en /config" }
}
```

## 3. Fase activa

```http
GET /api/v1/device/current-phase
```

```json
{ "phase": "vegetativa", "crop": "Tomates del invernadero 1", "active": true, "updated_at": "..." }
```

Sin fase activa: `{ "phase": null, "crop": null, "active": false, "updated_at": null }`.

## 4. Enviar telemetría

```http
POST /api/v1/device/telemetry
X-API-Key: <DEVICE_API_KEY>

{
  "device_id": "esp32-01",
  "timestamp": "2026-08-14T10:00:00Z",
  "temperature": 24.3,
  "humidity": 63.2,
  "soil_moisture": 58.1,
  "light": 720
}
```

- `timestamp` opcional; si falta se usa la hora del servidor.
- Campos opcionales si el hardware los tiene: `co2`, `substrate_temperature`,
  `ec`, `ph`, `water_level`.
- Campos adicionales desconocidos se **conservan** en el payload almacenado.
- Respuesta: `202 { "accepted": true, "entry_id": 123, "device_id": "esp32-01" }`.

## 5. Detección de cambios (sin diffs costosos)

`version` es un hash (16 hex) de la fase activa + sus objetivos. El ESP puede:

1. Consultar `/device/config` al arrancar.
2. Reconsultar cada N minutos (sugerido: 5–15 min) y comparar `version`.
3. Si `version` cambió, aplicar los nuevos objetivos; si no, descartar la
   respuesta sin costo.

## 6. Errores

| Código | Significado | Acción en el ESP |
|--------|-------------|------------------|
| `401`  | `X-API-Key` ausente o incorrecta | Mantener la última configuración conocida; reintentar con backoff. |
| `503`  | Servidor sin `DEVICE_API_KEY` configurada o sin fase activa útil | Idem. |
| `422`  | Telemetría con valores fuera de rango | Corregir el dato o descartarlo. |
| `5xx`  | Error interno | Reintentar con backoff; seguir operando con la última configuración. |

## 7. Separación de responsabilidades

El ESP recibe **objetivos** y es dueño del lazo de control:

```text
objetivos (HTTP) ──> ESP ──> sensores ──> lógica de control ──> actuadores
                                                                  (luces, ventilación, extracción, riego)
```

plant-service no envía comandos de actuación ni decide cuándo encender/apagar
nada. El firmware actual del proyecto (`esp32/`) publica por MQTT al backend
NestJS (`growbox/#`); la migración a este contrato HTTP puede hacerse por
fases, manteniendo MQTT para telemetría/estado y HTTP para la configuración.
