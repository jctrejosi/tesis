# plant-service

Servicio independiente en **FastAPI** que gestiona la configuración ambiental de
cultivos y entrega al ESP32 los parámetros objetivo que debe mantener con sus
sensores y actuadores. Las recomendaciones iniciales las genera **DeepSeek**;
el usuario puede ajustarlas manualmente desde la interfaz web.

> DeepSeek **no** controla actuadores: solo recomienda parámetros. La lógica de
> control (luces, ventilación, extracción, riego) vive en el ESP.

## Arquitectura

```text
DeepSeek ──(recomendación JSON validada)──> FastAPI ──(parámetros objetivo)──> ESP
                                              ▲
                                              │ (configuración manual vía gateway)
                                        NestJS (gateway :3000/plant-service/*)
                                              ▲
                                              │
                                        interfaz web
```

- La **interfaz web** habla únicamente con el backend NestJS (gateway único):
  `http://localhost:3000/plant-service/api/v1/*` se reenvía a este servicio en
  `http://localhost:8000/api/v1/*` (ver `backend/src/plant-proxy.ts`).
- El **ESP** consume este servicio **directamente** (endpoints `/api/v1/device/*`),
  no vía el gateway.

El servicio es una **fuente de configuración y supervisión**, no un controlador
que envía comandos de actuación.
de tiempo real.

## Cómo ejecutarlo

### Opción A — con el orquestador de la raíz (recomendado)

```bash
# En la raíz del repositorio (crea venv, instala deps, levanta en :8000)
npm run plant

# O todo el entorno junto:
npm run dev
```

### Opción B — manual

```bash
cd plant-service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # y define DEEPSEEK_API_KEY
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000/api/v1`
- Swagger UI: `http://localhost:8000/docs`

### Opción C — Docker

```bash
cd plant-service
docker build -t plant-service .
docker run --rm -p 8000:8000 --env-file .env plant-service
```

## Variables de entorno

| Variable                   | Por defecto                                              | Descripción |
|----------------------------|----------------------------------------------------------|-------------|
| `DATABASE_URL`             | `postgresql+psycopg://cea_user:cea_password@localhost:5438/cea_db` | Reutiliza la **TimescaleDB compartida** del proyecto (ver `db/`). |
| `DB_SCHEMA`                | `plant_service`                                          | Esquema propio dentro de la base compartida. |
| `HOST` / `PORT`            | `0.0.0.0` / `8000`                                       | Bind del servicio. |
| `CORS_ORIGINS`             | `http://localhost:5173,http://localhost:3000`            | Orígenes permitidos (coma). |
| `PLANT_SERVICE_URL` (backend NestJS) | `http://localhost:8000`                  | Destino del gateway `/plant-service/*` del backend. |
| `DEEPSEEK_API_KEY`         | *(vacía)*                                                | Clave de DeepSeek. Sin ella las recomendaciones devuelven 503. |
| `DEEPSEEK_BASE_URL`        | `https://api.deepseek.com`                               | Endpoint de la API. |
| `DEEPSEEK_MODEL`           | `deepseek-chat`                                          | Modelo usado. |
| `DEEPSEEK_TIMEOUT_SECONDS` | `30`                                                     | Timeout de la llamada. |
| `DEVICE_API_KEY`           | *(vacía)*                                                | Clave compartida para endpoints del ESP (`X-API-Key`). Vacía ⇒ endpoints deshabilitados (503). |

La API key de DeepSeek **solo** vive en el entorno del servicio; nunca se envía
al navegador ni se almacena en código.

## Persistencia

Reutiliza la instancia de **TimescaleDB** del proyecto (`db/docker-compose.yml`)
con un **esquema dedicado `plant_service`**, por lo que no interfiere con las
tablas del backend NestJS. Tablas creadas automáticamente al arrancar
(idempotente):

- `crops` — cultivos.
- `crop_phases` — fases con `targets` (configuración vigente) y
  `recommended_targets` (recomendación original de DeepSeek).
- `recommendations` — auditoría de cada respuesta validada del modelo.
- `device_telemetry` — mediciones enviadas por el ESP.

En los tests se usa SQLite en memoria (mismo modelo). Para desarrollo local sin
Docker también puede usarse SQLite: `DATABASE_URL=sqlite+aiosqlite:///./dev.db`.

## Seguridad y validación

- **Pydantic** valida todas las entradas y la respuesta de DeepSeek; una
  respuesta que no cumple el schema se **rechaza** (502) y no se persiste.
- La respuesta del modelo se normaliza defensivamente (alias en español/inglés,
  claves desconocidas → `custom`) antes de validarla estrictamente.
- Rangos validados (`min <= target <= max`, límites físicos en telemetría).
- **CORS** configurable por variables de entorno.
- **Autenticación del dispositivo**: clave estática compartida vía header
  `X-API-Key` (comparación en tiempo constante). Los endpoints web están
  abiertos y protegidos solo por CORS; el proyecto no tiene todavía un sistema
  de autenticación de usuarios (ver `backend/` NestJS).
- Timeout y manejo de errores de red/HTTP en la integración con DeepSeek.
- Logs estructurados por componente (`plant-service.*`).

## Contrato con el ESP

Ver [`docs/esp-contract.md`](docs/esp-contract.md): endpoints, headers,
payloads, versión de configuración y cadencia de polling recomendada.

## Pruebas

```bash
cd plant-service
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

## Decisiones de diseño relevantes

1. **Una recomendación nunca pisa una configuración manual.** Al solicitar una
   nueva recomendación: si la fase no fue tocada por el usuario se sincroniza;
   si fue modificada, solo se actualiza `recommended_targets` (referencia) y la
   configuración vigente queda intacta.
2. **Parámetros extensibles.** Los parámetros no contemplados por el schema
   viven en `custom` (por fase), de modo que agregar uno no requiere tocar la
   arquitectura.
3. **Parámetros informativos.** Si un parámetro es agronómicamente relevante
   pero el hardware no puede controlarlo (ej. CO₂), se marca
   `informational_only` y **no** se incluye en el payload del dispositivo.
4. **Payload mínimo para el microcontrolador.** Los endpoints `/device/*`
   entregan solo parámetros accionables + un `version` (hash) para detectar
   cambios sin diffs costosos.
