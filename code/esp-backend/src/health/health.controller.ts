import { Controller, Get, Inject, OnModuleInit } from '@nestjs/common';
import { DRIZZLE } from '../db/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

@Controller('health')
export class HealthController implements OnModuleInit {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  // Cuando el módulo se inicia, intentamos insertar una telemetría de prueba
  async onModuleInit() {
    try {
      // Insertar un dato de prueba en telemetry
      await this.db.execute(sql`
        INSERT INTO telemetry (time, device_id, sensor_id, metric_name, value)
        VALUES (now(), 1, 1, 'test_metric', 42.0)
        ON CONFLICT (time, device_id, sensor_id, metric_name) DO NOTHING
      `);
      console.log('Inserción de prueba en telemetry exitosa');
    } catch (err) {
      console.error(
        'Error al insertar en telemetry:',
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  @Get()
  async check() {
    // Ejecuta una consulta simple para verificar que todo funcione
    const result = await this.db.execute(sql`SELECT 1 as ok`);
    return { status: 'ok', db: result.rows[0] };
  }

  @Get('telemetry-count')
  async count() {
    const count = await this.db.execute(sql`
      SELECT count(*) FROM telemetry
    `);
    return { telemetry_rows: count.rows[0].count };
  }
}
