-- Habilitar la extensión TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ================================================================
-- Tablas de dominio (relacionales) – se manejarán con Drizzle/TypeORM
-- ================================================================

-- Usuarios (para autenticación futura)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Dispositivos (cada ESP32)
CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'esp32',  -- 'esp32', 'raspberry', etc.
    location    TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Sensores
CREATE TABLE IF NOT EXISTS sensors (
    id          SERIAL PRIMARY KEY,
    device_id   INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,                -- 'BME680 interior'
    model       TEXT NOT NULL,                -- 'BME680', 'AS7341', etc.
    alias       TEXT,                         -- nombre corto para código: 'bme_main'
    sensor_type TEXT NOT NULL,                -- 'temperature', 'humidity', 'co2', 'spectral', 'soil_ec', 'soil_moisture'
    metadata    JSONB DEFAULT '{}',           -- ej: { "i2c_address": "0x77" }
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Configuraciones dinámicas de sensores (calibraciones, intervalos, etc.)
CREATE TABLE IF NOT EXISTS sensor_configs (
    id          SERIAL PRIMARY KEY,
    sensor_id   INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    config_key  TEXT NOT NULL,                -- 'offset_temp', 'sample_interval_ms', 'alarm_threshold'
    config_value TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Actuadores (relés, iluminación, ventilación, riego, etc.)
CREATE TABLE IF NOT EXISTS actuators (
    id          SERIAL PRIMARY KEY,
    device_id   INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,                -- 'relay', 'light', 'fan', 'extractor', 'pump'
    state       JSONB DEFAULT '{}',           -- estado actual, ej: {"on": true, "speed": 80}
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Opcional: log de cambios de actuadores (para auditoría)
CREATE TABLE IF NOT EXISTS actuator_events (
    id          SERIAL PRIMARY KEY,
    actuator_id INT NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
    old_state   JSONB,
    new_state   JSONB,
    reason      TEXT,                          -- 'manual', 'rule_based', 'ai'
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- Tabla genérica de telemetría (el corazón del sistema)
-- ================================================================
CREATE TABLE telemetry (
    time        TIMESTAMPTZ NOT NULL,
    device_id   INT NOT NULL,
    sensor_id   INT NOT NULL,
    metric_name TEXT NOT NULL,       -- 'temperature', 'humidity', 'co2', 'f1_415nm', 'soil_moisture', etc.
    value       DOUBLE PRECISION NOT NULL
);

-- Convertir a hypertable particionada por tiempo
SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);

-- Índice único para evitar duplicados en una misma inserción
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_unique
    ON telemetry (time, device_id, sensor_id, metric_name);

-- Índice compuesto para las consultas más comunes (lecturas por dispositivo/sensor/métrica)
CREATE INDEX IF NOT EXISTS idx_telemetry_device_sensor_metric_time
    ON telemetry (device_id, sensor_id, metric_name, time DESC);

-- (Opcional) Índice adicional para consultas por métrica solamente
CREATE INDEX IF NOT EXISTS idx_telemetry_metric_time
    ON telemetry (metric_name, time DESC);

-- ================================================================
-- Políticas de gestión de datos temporales (recomendadas, pero opcionales al inicio)
-- ================================================================

-- 1. Compresión: activar después de 7 días de datos
-- ALTER TABLE telemetry SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'device_id, sensor_id, metric_name'
-- );
-- SELECT add_compression_policy('telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- 2. Retención: borrar datos crudos de más de 2 años (por ejemplo)
-- SELECT add_retention_policy('telemetry', INTERVAL '2 years', if_not_exists => TRUE);

-- 3. Agregados continuos (vistas materializadas) para dashboards
--    (Se crean después de tener claro qué vistas necesitas)