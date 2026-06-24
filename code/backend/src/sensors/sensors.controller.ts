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

@ApiTags('sensors')
@Controller('sensors')
export class SensorsController {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los sensores registrados' })
  @ApiResponse({ status: 200, description: 'Lista de sensores' })
  async list() {
    const result = await this.db.execute(sql`
      SELECT s.*, d.name as device_name
      FROM sensors s
      JOIN devices d ON s.device_id = d.id
      ORDER BY s.id
    `);
    return result.rows;
  }

  @Get(':alias')
  @ApiOperation({ summary: 'Obtener detalle de un sensor por su alias' })
  @ApiParam({
    name: 'alias',
    example: 'as7341',
    description: 'Alias del sensor',
  })
  @ApiResponse({ status: 200, description: 'Detalle del sensor' })
  async detail(@Param('alias') alias: string) {
    const result = await this.db.execute(sql`
      SELECT s.*, d.name as device_name
      FROM sensors s
      JOIN devices d ON s.device_id = d.id
      WHERE s.alias = ${alias}
    `);
    return result.rows[0] || { error: 'Sensor no encontrado' };
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo sensor' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['device_id', 'name', 'model', 'alias', 'sensor_type'],
      properties: {
        device_id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'BME680 Interior' },
        model: { type: 'string', example: 'BME680' },
        alias: { type: 'string', example: 'bme680' },
        sensor_type: { type: 'string', example: 'environmental' },
        metadata: { type: 'object', example: {} },
      },
    },
  })
  async create(
    @Body()
    body: {
      device_id: number;
      name: string;
      model: string;
      alias: string;
      sensor_type: string;
      metadata?: any;
    },
  ) {
    const result = await this.db.execute(sql`
      INSERT INTO sensors (device_id, name, model, alias, sensor_type, metadata)
      VALUES (${body.device_id}, ${body.name}, ${body.model}, ${body.alias}, ${body.sensor_type}, ${body.metadata ? JSON.stringify(body.metadata) : '{}'}::jsonb)
      ON CONFLICT (device_id, alias) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
    `);
    return result.rows[0];
  }

  @Put(':alias')
  @ApiOperation({ summary: 'Actualizar metadatos o nombre de un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nuevo nombre' },
        metadata: { type: 'object', example: { location: 'invernadero' } },
      },
    },
  })
  async update(
    @Param('alias') alias: string,
    @Body() body: { name?: string; metadata?: any },
  ) {
    const result = await this.db.execute(sql`
      UPDATE sensors
      SET 
        name = COALESCE(${body.name}, name),
        metadata = COALESCE(${body.metadata ? JSON.stringify(body.metadata) : null}::jsonb, metadata)
      WHERE alias = ${alias}
      RETURNING *
    `);
    return result.rows[0] || { error: 'Sensor no encontrado' };
  }

  @Delete(':alias')
  @ApiOperation({ summary: 'Eliminar un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  async delete(@Param('alias') alias: string) {
    await this.db.execute(sql`DELETE FROM sensors WHERE alias = ${alias}`);
    return { status: 'ok', message: `Sensor ${alias} eliminado` };
  }
}
