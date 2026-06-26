import { Controller, Get, Inject, OnModuleInit } from '@nestjs/common';
import { DRIZZLE } from '../db/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('health')
export class HealthController implements OnModuleInit {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private readonly mqttService: MqttService, // Inyección del servicio MQTT
  ) {}

  async onModuleInit() {
    try {
      const sampleId = uuidv4();
      await this.db.execute(sql`
        INSERT INTO telemetry (time, sample_id, device_id, sensor_id, metric_name, value)
        VALUES (now(), ${sampleId}::uuid, 1, 1, 'test_metric', 42.0)
        ON CONFLICT (time, sample_id, device_id, sensor_id, metric_name) DO NOTHING
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
    // Verificar BD
    const dbResult = await this.db.execute(sql`SELECT 1 as ok`);
    const dbStatus = dbResult.rows[0]?.ok === 1 ? 'connected' : 'error';

    // Verificar MQTT
    const mqttStatus = this.mqttService.isConnected()
      ? 'connected'
      : 'disconnected';

    return {
      status: 'ok',
      database: dbStatus,
      mqtt: mqttStatus,
    };
  }

  @Get('telemetry-count')
  async count() {
    const count = await this.db.execute(sql`
      SELECT count(*) FROM telemetry
    `);
    return { telemetry_rows: count.rows[0].count };
  }

  @Get('mqtt')
  mqttHealth() {
    const connected = this.mqttService.isConnected();
    return {
      mqtt: connected ? 'connected' : 'disconnected',
      broker: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    };
  }
}
