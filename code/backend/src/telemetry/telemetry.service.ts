import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql, SQL } from 'drizzle-orm';
import * as crypto from 'crypto';
import { DRIZZLE } from '../db/database.module';
import * as schema from '../db/schema';
import { DerivatesService } from '../derivates/derivates.service';

export interface TelemetryMessage {
  device_id: number;
  timestamp: string | number | null;
  metrics: Record<string, number>;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private readonly analyticsService: DerivatesService,
  ) {}

  async ingest(sensorAlias: string, message: TelemetryMessage) {
    const { device_id, timestamp, metrics } = message;

    // 1. Buscar el sensor
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) {
      this.logger.warn(`Sensor no encontrado para alias: ${sensorAlias}`);
      return;
    }

    // 2. Calcular el timestamp real
    const realTime = await this.resolveTimestamp(device_id, timestamp);

    // 3. Generar sample_id común para todas las métricas
    const sampleId = crypto.randomUUID();

    // 4. Payload completo (opcional)
    const rawPayload = JSON.stringify(message);

    // 5. Insertar cada métrica
    const insertPromises = Object.entries(metrics).map(
      ([metricName, value]) => {
        return this.db.execute(sql`
          INSERT INTO telemetry (time, sample_id, device_id, sensor_id, metric_name, value, raw_payload)
          VALUES (
            ${realTime}::timestamptz,
            ${sampleId}::uuid,
            ${device_id},
            ${sensorId},
            ${metricName},
            ${value},
            ${rawPayload}::jsonb
          )
          ON CONFLICT (time, sample_id, device_id, sensor_id, metric_name) DO NOTHING
        `);
      },
    );

    try {
      await Promise.all(insertPromises);
      this.logger.debug(
        `Ingestado: ${Object.keys(metrics).length} métricas de ${sensorAlias}`,
      );
    } catch (err) {
      this.logger.error('Error al insertar telemetría', err);
    }

    // 6. Procesar datos derivados
    await this.analyticsService.processSensorData(
      sensorAlias,
      sensorId,
      device_id,
      sampleId,
      realTime,
      metrics,
    );
  }

  private async resolveTimestamp(
    deviceId: number,
    timestamp: string | number | null | undefined,
  ): Promise<string> {
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    if (typeof timestamp === 'number') {
      const boots = await this.query<{
        boot_time: number;
        server_time: string;
      }>(sql`
        SELECT boot_time, server_time
        FROM device_boots
        WHERE device_id = ${deviceId}
        ORDER BY server_time DESC
        LIMIT 1
      `);

      if (boots.length > 0) {
        const { boot_time, server_time } = boots[0];
        const bootDate = new Date(server_time);
        const deltaMs = (timestamp - boot_time) / 1000;
        const realDate = new Date(bootDate.getTime() + deltaMs);
        return realDate.toISOString();
      }

      this.logger.warn(
        `No hay boot registrado para device ${deviceId}, usando now()`,
      );
      return new Date().toISOString();
    }

    return new Date().toISOString();
  }

  async getLatest(sensorAlias: string, limit = 10) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    return this.query<{ time: string; metric_name: string; value: number }>(sql`
      SELECT time, metric_name, value
      FROM telemetry
      WHERE sensor_id = ${sensorId}
      ORDER BY time DESC
      LIMIT ${limit}
    `);
  }

  async getCurrentValues(sensorAlias: string) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    return this.query<{ metric_name: string; value: number; time: string }>(sql`
      SELECT DISTINCT ON (metric_name) 
        metric_name, 
        value, 
        time
      FROM telemetry
      WHERE sensor_id = ${sensorId}
        AND time > now() - interval '1 hour'
      ORDER BY metric_name, time DESC
    `);
  }

  async getByTimeRange(
    sensorAlias: string,
    metricName: string,
    start: string,
    end: string,
    limit = 100,
  ) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    return this.query<{ time: string; value: number }>(sql`
      SELECT time, value
      FROM telemetry
      WHERE sensor_id = ${sensorId}
        AND metric_name = ${metricName}
        AND time BETWEEN ${start}::timestamptz AND ${end}::timestamptz
      ORDER BY time DESC
      LIMIT ${limit}
    `);
  }

  async getAggregated(
    sensorAlias: string,
    metricName: string,
    bucket: '1 hour' | '1 day',
    start: string,
    end: string,
  ) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    return this.query<{
      bucket: string;
      avg_value: number;
      min_value: number;
      max_value: number;
      samples: number;
    }>(sql`
      SELECT 
        time_bucket(${bucket}::interval, time) AS bucket,
        avg(value) as avg_value,
        min(value) as min_value,
        max(value) as max_value,
        count(*) as samples
      FROM telemetry
      WHERE sensor_id = ${sensorId}
        AND metric_name = ${metricName}
        AND time BETWEEN ${start}::timestamptz AND ${end}::timestamptz
      GROUP BY bucket
      ORDER BY bucket DESC
    `);
  }

  async getAvailableMetrics(sensorAlias: string) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    return this.query<{ metric_name: string }>(sql`
      SELECT DISTINCT metric_name
      FROM telemetry
      WHERE sensor_id = ${sensorId}
      ORDER BY metric_name
    `);
  }

  async getReadings(sensorAlias: string, limit = 10) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];

    const rows = await this.query<{
      time: string;
      metric_name: string;
      value: number;
      sample_id: string;
    }>(sql`
      WITH last_samples AS (
        SELECT sample_id, MAX(time) AS time
        FROM telemetry
        WHERE sensor_id = ${sensorId}
        GROUP BY sample_id
        ORDER BY time DESC
        LIMIT ${limit}
      )
      SELECT t.time, t.metric_name, t.value, t.sample_id
      FROM telemetry t
      JOIN last_samples s ON t.sample_id = s.sample_id
      WHERE t.sensor_id = ${sensorId}
      ORDER BY t.time DESC, t.metric_name
    `);

    const readings = new Map<
      string,
      { time: string; metrics: Record<string, number> }
    >();

    for (const row of rows) {
      const { time, sample_id, metric_name, value } = row;
      if (!readings.has(sample_id)) {
        readings.set(sample_id, { time, metrics: {} });
      }
      readings.get(sample_id)!.metrics[metric_name] = value;
    }

    return Array.from(readings.values());
  }

  // Helpers privados

  private async getSensorId(alias: string): Promise<number | null> {
    const rows = await this.query<{ id: number }>(sql`
      SELECT id FROM sensors WHERE alias = ${alias} LIMIT 1
    `);
    return rows.length ? rows[0].id : null;
  }

  private async query<T>(query: SQL): Promise<T[]> {
    try {
      const result = await this.db.execute(query);
      if (!result || !('rows' in result)) {
        throw new Error('Unexpected result format from database query');
      }
      return result.rows as T[];
    } catch (err) {
      this.logger.error('Error en consulta SQL', err);
      return [];
    }
  }
}
