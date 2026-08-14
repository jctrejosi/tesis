import { Controller, Get, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private readonly mqttService: MqttService,
  ) {}

  @Get()
  async check() {
    const dbResult = await this.db.execute(sql`SELECT 1 as ok`);
    const dbStatus = dbResult.rows[0]?.ok === 1 ? 'connected' : 'error';

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
