import { Controller, Get, Post, Param, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import { MqttService } from '../mqtt/mqtt.service';
import * as schema from '../db/schema';

type ActuatorCommandPayload = {
  state?: string;
  [key: string]: unknown;
};

@ApiTags('actuators')
@Controller('actuators')
export class ActuatorsController {
  constructor(
    private readonly mqttService: MqttService,
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los actuadores registrados' })
  async list() {
    const result = await this.db.execute(sql`
      SELECT a.*, d.name as device_name
      FROM actuators a
      JOIN devices d ON a.device_id = d.id
      ORDER BY a.id
    `);
    return result.rows;
  }

  @Get(':name')
  @ApiOperation({ summary: 'Obtener estado actual de un actuador por nombre' })
  @ApiParam({ name: 'name', example: 'ventilacion_principal' })
  async getState(@Param('name') name: string) {
    const result = await this.db.execute(sql`
      SELECT * FROM actuators WHERE name = ${name} LIMIT 1
    `);
    return result.rows[0] || { error: 'Actuador no encontrado' };
  }

  @Post(':name/command')
  @ApiOperation({ summary: 'Enviar comando a un actuador vía MQTT' })
  @ApiParam({ name: 'name', example: 'ventilacion_principal' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', example: 'set' },
        payload: { type: 'object', example: { state: 'on', speed: 80 } },
      },
    },
  })
  async sendCommand(
    @Param('name') name: string,
    @Body() body: { command: string; payload?: ActuatorCommandPayload },
  ) {
    const actuator = await this.db.execute<{ type: string }>(sql`
      SELECT type FROM actuators WHERE name = ${name} LIMIT 1
    `);
    if (!actuator.rows.length) {
      return { error: 'Actuador no encontrado' };
    }
    const actuatorType = actuator.rows[0].type;

    this.mqttService.sendActuatorCommand(
      actuatorType,
      body.command,
      body.payload ?? {},
    );

    if (body.command === 'set' && body.payload?.state) {
      const oldState = await this.db.execute<{ state: unknown }>(sql`
        SELECT state FROM actuators WHERE name = ${name} LIMIT 1
      `);
      await this.db.execute(sql`
        INSERT INTO actuator_events (actuator_id, old_state, new_state, reason)
        VALUES (
          (SELECT id FROM actuators WHERE name = ${name}),
          ${oldState.rows[0]?.state || null}::jsonb,
          ${JSON.stringify(body.payload)}::jsonb,
          'manual'
        )
      `);
      await this.db.execute(sql`
        UPDATE actuators SET state = ${JSON.stringify(body.payload)}::jsonb
        WHERE name = ${name}
      `);
    }

    return {
      status: 'ok',
      message: `Comando ${body.command} enviado a ${name}`,
    };
  }
}
