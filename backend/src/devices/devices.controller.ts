import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import * as schema from '../db/schema';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los dispositivos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de dispositivos con conteo de sensores',
  })
  async list() {
    const result = await this.db.execute(sql`
      SELECT 
        d.*,
        COUNT(s.id) as sensor_count
      FROM devices d
      LEFT JOIN sensors s ON d.id = s.device_id
      GROUP BY d.id
      ORDER BY d.id
    `);
    return result.rows;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de un dispositivo con sus sensores y actuadores',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID del dispositivo' })
  async detail(@Param('id') id: number) {
    const device = await this.db.execute(sql`
      SELECT * FROM devices WHERE id = ${id}
    `);

    if (!device.rows.length) {
      return { error: 'Dispositivo no encontrado' };
    }

    const sensors = await this.db.execute(sql`
      SELECT * FROM sensors WHERE device_id = ${id} ORDER BY id
    `);

    const actuators = await this.db.execute(sql`
      SELECT * FROM actuators WHERE device_id = ${id} ORDER BY id
    `);

    return {
      ...device.rows[0],
      sensors: sensors.rows,
      actuators: actuators.rows,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo dispositivo (ESP32)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'GrowBox Principal' },
        type: { type: 'string', example: 'esp32', default: 'esp32' },
        location: { type: 'string', example: 'Invernadero 1' },
        metadata: { type: 'object', example: { ip: '192.168.1.100' } },
        user_id: {
          type: 'number',
          example: null,
          description: 'ID del usuario propietario (opcional)',
        },
      },
    },
  })
  async create(
    @Body()
    body: {
      name: string;
      type?: string;
      location?: string;
      metadata?: any;
      user_id?: number;
    },
  ) {
    const result = await this.db.execute(sql`
      INSERT INTO devices (name, type, location, metadata, user_id)
      VALUES (
        ${body.name},
        ${body.type || 'esp32'},
        ${body.location || null},
        ${body.metadata ? JSON.stringify(body.metadata) : '{}'}::jsonb,
        ${body.user_id || null}
      )
      RETURNING *
    `);
    return result.rows[0];
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de un dispositivo' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nuevo nombre' },
        type: { type: 'string', example: 'esp32' },
        location: { type: 'string', example: 'Nueva ubicación' },
        metadata: { type: 'object', example: {} },
      },
    },
  })
  async update(
    @Param('id') id: number,
    @Body()
    body: {
      name?: string;
      type?: string;
      location?: string;
      metadata?: any;
    },
  ) {
    const result = await this.db.execute(sql`
      UPDATE devices
      SET 
        name = COALESCE(${body.name}, name),
        type = COALESCE(${body.type}, type),
        location = COALESCE(${body.location}, location),
        metadata = COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata)
      WHERE id = ${id}
      RETURNING *
    `);
    return result.rows[0] || { error: 'Dispositivo no encontrado' };
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Eliminar un dispositivo y todos sus sensores/actuadores asociados',
  })
  @ApiParam({ name: 'id', example: 1 })
  async delete(@Param('id') id: number) {
    // El ON DELETE CASCADE se encarga de eliminar sensors, actuators, actuator_events, telemetry
    await this.db.execute(sql`DELETE FROM devices WHERE id = ${id}`);
    return { status: 'ok', message: `Dispositivo ${id} eliminado` };
  }

  @Get(':id/status')
  @ApiOperation({
    summary:
      'Obtener estado resumido del dispositivo (última telemetría recibida)',
  })
  @ApiParam({ name: 'id', example: 1 })
  async status(@Param('id') id: number) {
    const device = await this.db.execute(sql`
      SELECT * FROM devices WHERE id = ${id}
    `);
    if (!device.rows.length) {
      return { error: 'Dispositivo no encontrado' };
    }

    // Última telemetría recibida de este dispositivo
    const lastTelemetry = await this.db.execute(sql`
      SELECT t.time, s.alias, s.name as sensor_name
      FROM telemetry t
      JOIN sensors s ON t.sensor_id = s.id
      WHERE t.device_id = ${id}
      ORDER BY t.time DESC
      LIMIT 1
    `);

    // Conteo de sensores activos (que enviaron datos en la última hora)
    const activeSensors = await this.db.execute(sql`
      SELECT COUNT(DISTINCT sensor_id) as count
      FROM telemetry
      WHERE device_id = ${id}
        AND time > now() - interval '1 hour'
    `);

    return {
      ...device.rows[0],
      last_telemetry: lastTelemetry.rows[0] || null,
      active_sensors: Number(activeSensors.rows[0].count),
    };
  }
}
