import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

import { DRIZZLE } from '../db/database.module';
import * as schema from '../db/schema';

import { calculateAs7341 } from './formulas/as7341.formula';
import { calculateBme680 } from './formulas/bme680.formula';
import { calculateMhz19b } from './formulas/mhz19b.formula';
import { calculateSoilEc } from './formulas/soil_ec.formula';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private lastCo2Reading: {
    value: number;
    time: string;
  } | null = null;

  constructor(
    @Inject(DRIZZLE)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async processSensorData(
    sensorAlias: string,
    sensorId: number,
    deviceId: number,
    sampleId: string,
    time: string,
    metrics: Record<string, number>,
  ): Promise<void> {
    let derived: Record<string, number> = {};

    switch (sensorAlias) {
      case 'as7341':
        derived = calculateAs7341(metrics) as unknown as Record<string, number>;
        break;

      case 'bme680':
        derived = calculateBme680(metrics) as unknown as Record<string, number>;
        break;

      case 'mhz19b': {
        const currentCo2 = metrics.co2;
        if (currentCo2 !== undefined) {
          const prev = this.lastCo2Reading;
          const timeDiff = prev
            ? (new Date(time).getTime() - new Date(prev.time).getTime()) / 1000
            : 0;
          const result = calculateMhz19b(
            currentCo2,
            prev?.value ?? null,
            timeDiff,
          );
          if (result.co2_change_rate != null) {
            derived.co2_change_rate = result.co2_change_rate;
          }
          this.lastCo2Reading = { value: currentCo2, time };
        }
        break;
      }

      case 'soil_ec':
        derived = calculateSoilEc(metrics) as unknown as Record<string, number>;
        break;
    }

    // Fusionar crudos + derivados
    const allMetrics = { ...metrics, ...derived };

    const entries: Array<[string, number]> = Object.entries(allMetrics).filter(
      (entry): entry is [string, number] => entry[1] != null,
    );

    for (const [metricName, value] of entries) {
      await this.db.execute(sql`
        INSERT INTO telemetry (time, sample_id, device_id, sensor_id, metric_name, value)
        VALUES (${time}::timestamptz, ${sampleId}::uuid, ${deviceId}, ${sensorId}, ${metricName}, ${value})
        ON CONFLICT (time, sample_id, device_id, sensor_id, metric_name) DO NOTHING
      `);
    }

    if (entries.length > 0) {
      this.logger.debug(
        `Insertadas ${entries.length} métricas (crudos + derivados) de ${sensorAlias}`,
      );
    }
  }

  async getDerived(
    sensorAlias: string,
    metricName: string,
    limit = 100,
  ): Promise<{ time: string; value: number }[]> {
    try {
      const result = await this.db.execute<{ time: string; value: number }>(sql`
        SELECT t.time, t.value
        FROM telemetry t
        JOIN sensors s ON s.id = t.sensor_id
        WHERE s.alias = ${sensorAlias} AND t.metric_name = ${metricName}
        ORDER BY t.time DESC
        LIMIT ${limit}
      `);
      return result.rows;
    } catch (err) {
      this.logger.error(
        `Error obteniendo derivados de ${sensorAlias}/${metricName}`,
        err,
      );
      return [];
    }
  }
}
