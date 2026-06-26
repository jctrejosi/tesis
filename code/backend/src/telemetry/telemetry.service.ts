import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DRIZZLE } from '../db/database.module';
import * as schema from '../db/schema';

export interface TelemetryMessage {
  device_id: number;
  timestamp: string | number | null;
  metrics: Record<string, number>;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async ingest(sensorAlias: string, message: TelemetryMessage) {
    const { device_id, timestamp, metrics } = message;

    // 1. Buscar el sensor
    const sensor = await this.db.execute(sql`
      SELECT id FROM sensors WHERE alias = ${sensorAlias} LIMIT 1
    `);
    if (!sensor.rows.length) {
      this.logger.warn(`Sensor no encontrado para alias: ${sensorAlias}`);
      return;
    }
    const sensorId = sensor.rows[0].id as number;

    // 2. Calcular el timestamp real
    const realTime = await this.resolveTimestamp(device_id, timestamp);

    // 3. Generar sample_id común para todas las métricas
    const sampleId = uuidv4();

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
  }

  /**
   * Convierte el timestamp del ESP32 (microsegundos desde boot) a una fecha real.
   * - Si es string ISO8601: se usa directamente.
   * - Si es número: busca el último boot del dispositivo y calcula la fecha real.
   * - Si es null/undefined: se usa now().
   */
  private async resolveTimestamp(
    deviceId: number,
    timestamp: string | number | null | undefined,
  ): Promise<string> {
    // Caso 1: ya es string ISO8601
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    // Caso 2: es número (microsegundos desde boot)
    if (typeof timestamp === 'number') {
      const boot = await this.db.execute(sql`
      SELECT boot_time, server_time
      FROM device_boots
      WHERE device_id = ${deviceId}
      ORDER BY server_time DESC
      LIMIT 1
    `);

      if (boot.rows.length > 0) {
        const { boot_time, server_time } = boot.rows[0] as {
          boot_time: number;
          server_time: string;
        };
        // Calcular la fecha real en JavaScript y devolver ISO string
        const bootDate = new Date(server_time);
        const deltaMs = (timestamp - boot_time) / 1000; // microsegundos a milisegundos
        const realDate = new Date(bootDate.getTime() + deltaMs);
        return realDate.toISOString();
      }

      // Si no hay boot registrado, usar now()
      this.logger.warn(
        `No hay boot registrado para device ${deviceId}, usando now()`,
      );
      return new Date().toISOString();
    }

    // Caso 3: null/undefined → usar now()
    return new Date().toISOString();
  }

  // Método para obtener las últimas lecturas de un sensor (para debug)
  async getLatest(sensorAlias: string, limit = 10) {
    const sensor = await this.db.execute(sql`
      SELECT id FROM sensors WHERE alias = ${sensorAlias} LIMIT 1
    `);
    if (!sensor.rows.length) return [];
    const sensorId = sensor.rows[0].id as number;

    const result = await this.db.execute(sql`
      SELECT time, metric_name, value
      FROM telemetry
      WHERE sensor_id = ${sensorId}
      ORDER BY time DESC
      LIMIT ${limit}
    `);
    return result.rows;
  }

  // Obtener último valor de cada métrica de un sensor (ventana 1 hora)
  async getCurrentValues(sensorAlias: string) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];
    return this.db.execute(sql`
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

  // Lecturas de una métrica en rango de tiempo
  async getByTimeRange(
    sensorAlias: string,
    metricName: string,
    start: string,
    end: string,
    limit = 100,
  ) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];
    return this.db.execute(sql`
    SELECT time, value
    FROM telemetry
    WHERE sensor_id = ${sensorId}
      AND metric_name = ${metricName}
      AND time BETWEEN ${start}::timestamptz AND ${end}::timestamptz
    ORDER BY time DESC
    LIMIT ${limit}
  `);
  }

  // Datos agregados por hora o día
  async getAggregated(
    sensorAlias: string,
    metricName: string,
    bucket: '1 hour' | '1 day',
    start: string,
    end: string,
  ) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];
    return this.db.execute(sql`
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

  // Listar métricas disponibles para un sensor
  async getAvailableMetrics(sensorAlias: string) {
    const sensorId = await this.getSensorId(sensorAlias);
    if (!sensorId) return [];
    return this.db.execute(sql`
    SELECT DISTINCT metric_name
    FROM telemetry
    WHERE sensor_id = ${sensorId}
    ORDER BY metric_name
  `);
  }

  // Helper privado
  private async getSensorId(alias: string): Promise<number | null> {
    const result = await this.db.execute(sql`
    SELECT id FROM sensors WHERE alias = ${alias} LIMIT 1
  `);
    return result.rows.length ? (result.rows[0].id as number) : null;
  }
}
