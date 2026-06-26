import { Controller, Get, Post, Param, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import { MqttService } from '../mqtt/mqtt.service';
import * as schema from '../db/schema';

type ActuatorCommandPayload = {
  state?: string;
  channel?: number; // <-- agregado para relay
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
        payload: {
          type: 'object',
          example: { state: 'ON', channel: 1, speed: 80 },
        },
      },
    },
  })
  async sendCommand(
    @Param('name') name: string,
    @Body() body: { command: string; payload?: ActuatorCommandPayload },
  ) {
    // 1. Obtener el actuador
    const actuator = await this.db.execute<{
      type: string;
      state: Record<string, unknown> | null;
      id: number;
    }>(sql`
      SELECT id, type, state FROM actuators WHERE name = ${name} LIMIT 1
    `);
    if (!actuator.rows.length) {
      return { error: 'Actuador no encontrado' };
    }
    const actuatorType = actuator.rows[0].type;
    const actuatorId = actuator.rows[0].id;
    const currentState: Record<string, unknown> = actuator.rows[0].state ?? {};

    // 2. Validación especial para relay
    if (actuatorType === 'relay' && body.command === 'set') {
      const payload: ActuatorCommandPayload = body.payload ?? {};
      if (
        typeof payload.channel !== 'number' ||
        payload.channel < 1 ||
        payload.channel > 4
      ) {
        return { error: 'Para relay, el payload debe incluir channel (1-4)' };
      }
      if (
        typeof payload.state !== 'string' ||
        !['ON', 'OFF'].includes(payload.state)
      ) {
        return {
          error: 'Para relay, el payload debe incluir state ("ON" o "OFF")',
        };
      }
    }

    // 3. Enviar comando MQTT
    this.mqttService.sendActuatorCommand(
      actuatorType,
      body.command,
      body.payload ?? {},
    );

    // 4. Actualizar estado en la base de datos (solo si es comando 'set')
    if (body.command === 'set' && body.payload) {
      const payload = body.payload;

      // Construir el nuevo estado respetando el tipo de actuador
      let newState: Record<string, unknown>;

      if (actuatorType === 'relay') {
        // Para relay, actualizar solo el canal específico (channel_N)
        const channelKey = `channel_${payload.channel}`;
        newState = {
          ...currentState,
          [channelKey]: payload.state,
        };
      } else {
        // Otros actuadores: guardar el payload completo (o un subconjunto)
        // Aquí podrías personalizar según el tipo
        newState = { ...payload };
      }

      // Guardar evento de cambio
      await this.db.execute(sql`
        INSERT INTO actuator_events (actuator_id, old_state, new_state, reason)
        VALUES (
          ${actuatorId},
          ${JSON.stringify(currentState)}::jsonb,
          ${JSON.stringify(newState)}::jsonb,
          'manual'
        )
      `);

      // Actualizar estado del actuador
      await this.db.execute(sql`
        UPDATE actuators SET state = ${JSON.stringify(newState)}::jsonb
        WHERE id = ${actuatorId}
      `);

      return {
        status: 'ok',
        message: `Comando ${body.command} enviado a ${name}`,
        new_state: newState,
      };
    }

    return {
      status: 'ok',
      message: `Comando ${body.command} enviado a ${name}`,
    };
  }
}
