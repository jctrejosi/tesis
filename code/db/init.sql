-- ================================================================
-- extensiones
-- ================================================================

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- dominio: usuarios
-- ================================================================

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- dominio: dispositivos
-- ================================================================

CREATE TABLE IF NOT EXISTS devices (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'esp32',
    location    TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id
    ON devices(user_id);

    -- ================================================================
-- Tabla para registrar cada arranque de un dispositivo
-- y poder convertir el timestamp interno (microsegundos) a hora real
-- ================================================================
CREATE TABLE IF NOT EXISTS device_boots (
    id           BIGSERIAL PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    boot_time    BIGINT NOT NULL,            -- microsegundos internos reportados por el ESP
    server_time  TIMESTAMPTZ NOT NULL DEFAULT now(), -- instante real en el servidor al recibir el boot
    version      TEXT,                        -- versión de firmware (opcional)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_boots_device_id
    ON device_boots(device_id, server_time DESC);

-- ================================================================
-- dominio: sensores
-- ================================================================

CREATE TABLE IF NOT EXISTS sensors (
    id           BIGSERIAL PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    model        TEXT NOT NULL,
    alias        TEXT NOT NULL,
    sensor_type  TEXT NOT NULL,
    metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_sensors_device_id
    ON sensors(device_id);

CREATE INDEX IF NOT EXISTS idx_sensors_model
    ON sensors(model);

-- ================================================================
-- dominio: configuraciones de sensores
-- se guarda como jsonb para no rigidizar el esquema
-- ================================================================

CREATE TABLE IF NOT EXISTS sensor_configs (
    id          BIGSERIAL PRIMARY KEY,
    sensor_id   BIGINT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    config      JSONB NOT NULL DEFAULT '{}'::jsonb,
    version     INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_configs_sensor_id
    ON sensor_configs(sensor_id);

CREATE INDEX IF NOT EXISTS idx_sensor_configs_updated_at
    ON sensor_configs(updated_at DESC);

-- ================================================================
-- dominio: actuadores
-- ================================================================

CREATE TABLE IF NOT EXISTS actuators (
    id          BIGSERIAL PRIMARY KEY,
    device_id   BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    state       JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, name)
);

CREATE INDEX IF NOT EXISTS idx_actuators_device_id
    ON actuators(device_id);

-- ================================================================
-- dominio: eventos de actuadores
-- ================================================================

CREATE TABLE IF NOT EXISTS actuator_events (
    id           BIGSERIAL PRIMARY KEY,
    actuator_id  BIGINT NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
    old_state    JSONB,
    new_state    JSONB,
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actuator_events_actuator_id
    ON actuator_events(actuator_id);

CREATE INDEX IF NOT EXISTS idx_actuator_events_created_at
    ON actuator_events(created_at DESC);

-- ================================================================
-- telemetría: tabla genérica de series temporales
-- una fila = una métrica puntual de una muestra
-- ================================================================

CREATE TABLE IF NOT EXISTS telemetry (
    time         TIMESTAMPTZ NOT NULL,
    sample_id    UUID NOT NULL DEFAULT gen_random_uuid(),
    device_id    BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    sensor_id    BIGINT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    metric_name  TEXT NOT NULL,
    value        DOUBLE PRECISION NOT NULL,
    unit         TEXT,
    quality      SMALLINT NOT NULL DEFAULT 100,
    raw_payload  JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- dominio: configuraciones de actuadores
-- misma lógica que sensor_configs pero para actuadores
-- ================================================================

CREATE TABLE IF NOT EXISTS actuator_configs (
    id            BIGSERIAL PRIMARY KEY,
    actuator_id   BIGINT NOT NULL REFERENCES actuators(id) ON DELETE CASCADE,
    config        JSONB NOT NULL DEFAULT '{}'::jsonb,
    version       INT NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actuator_configs_actuator_id
    ON actuator_configs(actuator_id);

CREATE INDEX IF NOT EXISTS idx_actuator_configs_updated_at
    ON actuator_configs(updated_at DESC);

-- trigger para mantener updated_at automáticamente
DROP TRIGGER IF EXISTS trg_actuator_configs_updated_at ON actuator_configs;

CREATE TRIGGER trg_actuator_configs_updated_at
BEFORE UPDATE ON actuator_configs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- convertir en hypertable
SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);

-- restricción UNIQUE para ON CONFLICT
ALTER TABLE telemetry 
    ADD CONSTRAINT uq_telemetry_sample_metric 
    UNIQUE (time, sample_id, device_id, sensor_id, metric_name);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_sensor_metric_time
    ON telemetry (device_id, sensor_id, metric_name, time DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_time
    ON telemetry (sensor_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_metric_time
    ON telemetry (metric_name, time DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_sample_id
    ON telemetry (sample_id);

CREATE TABLE IF NOT EXISTS sensor_analytics (
    time        TIMESTAMPTZ NOT NULL,
    sample_id   UUID NOT NULL,
    sensor_id   BIGINT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (time, sample_id, sensor_id, metric_name)
);

SELECT create_hypertable('sensor_analytics', 'time', if_not_exists => TRUE);

-- ================================================================
-- compresión y retención
-- ================================================================
-- Recomendado activarlo después de validar el flujo de datos.

-- ALTER TABLE telemetry SET (
--     timescaledb.compress,
--     timescaledb.compress_segmentby = 'device_id, sensor_id, metric_name'
-- );
-- SELECT add_compression_policy('telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- SELECT add_retention_policy('telemetry', INTERVAL '2 years', if_not_exists => TRUE);

-- ================================================================
-- utilidad opcional: actualizar updated_at en sensor_configs
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sensor_configs_updated_at ON sensor_configs;

CREATE TRIGGER trg_sensor_configs_updated_at
BEFORE UPDATE ON sensor_configs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();