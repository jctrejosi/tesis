import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import { MqttService } from '../mqtt/mqtt.service';
import * as schema from '../db/schema';

@ApiTags('config')
@Controller('config')
export class ConfigController {
  constructor(
    private readonly mqttService: MqttService,
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  @Get('sensors/:alias')
  @ApiOperation({
    summary: 'Obtener la última configuración guardada de un sensor',
  })
  @ApiParam({ name: 'alias', example: 'as7341' })
  async getConfig(@Param('alias') alias: string) {
    const result = await this.db.execute(sql`
      SELECT sc.config, sc.version, sc.updated_at
      FROM sensor_configs sc
      JOIN sensors s ON sc.sensor_id = s.id
      WHERE s.alias = ${alias}
      ORDER BY sc.version DESC
      LIMIT 1
    `);
    return result.rows[0] || { config: {}, version: 0 };
  }

  @Put('sensors/:alias')
  @ApiOperation({
    summary: 'Guardar y enviar configuración a un sensor vía MQTT',
  })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiBody({ description: 'Configuración en formato JSON', type: Object })
  async updateConfig(@Param('alias') alias: string, @Body() config: any) {
    // Buscar sensor
    const sensor = await this.db.execute(sql`
      SELECT id FROM sensors WHERE alias = ${alias} LIMIT 1
    `);
    if (!sensor.rows.length) {
      return { error: 'Sensor no encontrado' };
    }
    const sensorId = sensor.rows[0].id;

    // Guardar nueva versión de config en BD
    const currentVersion = await this.db.execute(sql`
      SELECT COALESCE(MAX(version), 0) as max_version
      FROM sensor_configs
      WHERE sensor_id = ${sensorId}
    `);
    const newVersion = Number(currentVersion.rows[0].max_version) + 1;

    await this.db.execute(sql`
      INSERT INTO sensor_configs (sensor_id, config, version)
      VALUES (${sensorId}, ${JSON.stringify(config)}::jsonb, ${newVersion})
    `);

    // Enviar al ESP32 por MQTT
    this.mqttService.sendSensorConfig(alias, config);

    return {
      status: 'ok',
      message: `Configuración v${newVersion} enviada a ${alias}`,
      version: newVersion,
    };
  }

  @Post('sensors/:alias/read')
  @ApiOperation({ summary: 'Solicitar lectura inmediata de un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  requestRead(@Param('alias') alias: string) {
    this.mqttService.requestSensorRead(alias);
    return { status: 'ok', message: `Comando READ enviado a ${alias}` };
  }

  @Get('actuators/:name')
  @ApiOperation({
    summary: 'Obtener la última configuración guardada de un actuador',
  })
  @ApiParam({ name: 'name', example: 'relay_principal' })
  async getActuatorConfig(@Param('name') name: string) {
    const actuator = await this.db.execute<{ id: number; type: string }>(sql`
    SELECT id, type FROM actuators WHERE name = ${name} LIMIT 1
  `);
    if (!actuator.rows.length) {
      return { error: 'Actuador no encontrado' };
    }
    const result = await this.db.execute(sql`
    SELECT config, version, updated_at
    FROM actuator_configs
    WHERE actuator_id = ${actuator.rows[0].id}
    ORDER BY version DESC
    LIMIT 1
  `);
    return result.rows[0] || { config: {}, version: 0 };
  }

  @Put('actuators/:name')
  @ApiOperation({
    summary: 'Guardar y enviar configuración a un actuador vía MQTT',
  })
  @ApiParam({ name: 'name', example: 'relay_principal' })
  @ApiBody({ description: 'Configuración en formato JSON', type: Object })
  async updateActuatorConfig(
    @Param('name') name: string,
    @Body() config: Record<string, any>,
  ) {
    const actuator = await this.db.execute<{ id: number; type: string }>(sql`
    SELECT id, type FROM actuators WHERE name = ${name} LIMIT 1
  `);
    if (!actuator.rows.length) {
      return { error: 'Actuador no encontrado' };
    }

    const actuatorType = actuator.rows[0].type;
    const actuatorId = actuator.rows[0].id;

    // Guardar nueva versión en BD (opcional, el ESP32 confirmará y se sobrescribirá)
    const currentVersion = await this.db.execute(sql`
    SELECT COALESCE(MAX(version), 0) as max_version
    FROM actuator_configs
    WHERE actuator_id = ${actuatorId}
  `);
    const newVersion = Number(currentVersion.rows[0].max_version) + 1;

    await this.db.execute(sql`
    INSERT INTO actuator_configs (actuator_id, config, version)
    VALUES (${actuatorId}, ${JSON.stringify(config)}::jsonb, ${newVersion})
  `);

    // Enviar al ESP32 por MQTT usando el comando 'config'
    this.mqttService.sendActuatorCommand(actuatorType, 'config', config);

    return {
      status: 'ok',
      message: `Configuración v${newVersion} enviada a ${name}`,
      version: newVersion,
    };
  }
}
