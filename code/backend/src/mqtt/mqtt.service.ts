import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import {
  TelemetryService,
  TelemetryMessage,
} from '../telemetry/telemetry.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(
    private readonly telemetryService: TelemetryService,
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  onModuleInit() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const clientId = process.env.MQTT_CLIENT_ID || 'cea_backend';

    const client = mqtt.connect(brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 5000,
    });

    this.client = client;

    client.on('connect', () => {
      this.logger.log(`Conectado a MQTT broker: ${brokerUrl}`);

      // Suscribirse a telemetría de todos los sensores
      client.subscribe('growbox/+/data', (err) => {
        if (err) {
          this.logger.error('Error al suscribirse a growbox/+/data', err);
        } else {
          this.logger.log('Suscrito a growbox/+/data');
        }
      });

      // Suscribirse a cambios de estado de los relés
      client.subscribe('growbox/relay/+/state', (err) => {
        if (err) {
          this.logger.error(
            'Error al suscribirse a growbox/relay/+/state',
            err,
          );
        } else {
          this.logger.log('Suscrito a growbox/relay/+/state');
        }
      });

      // Suscribirse a estado general de la growbox
      client.subscribe('growbox/status', (err) => {
        if (err) {
          this.logger.error('Error al suscribirse a growbox/status', err);
        } else {
          this.logger.log('Suscrito a growbox/status');
        }
      });

      // NUEVA SUSCRIPCIÓN: respuestas de configuración de sensores
      client.subscribe('growbox/+/config', (err) => {
        if (err) {
          this.logger.error('Error al suscribirse a growbox/+/config', err);
        } else {
          this.logger.log(
            'Suscrito a growbox/+/config (confirmaciones de configuración)',
          );
        }
      });
    });

    client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    client.on('error', (err) => {
      this.logger.error('Error de conexión MQTT', err);
    });
  }

  private async handleStatusMessage(payload: Buffer) {
    try {
      const msg = JSON.parse(payload.toString()) as {
        device_id?: number;
        status?: string;
        boot_time?: number;
        version?: string;
      };

      if (msg.status === 'boot' && msg.device_id) {
        await this.db.execute(sql`
        INSERT INTO device_boots (device_id, boot_time, server_time, version)
        VALUES (${msg.device_id}, ${msg.boot_time ?? 0}, now(), ${msg.version ?? null})
      `);
        this.logger.log(`Boot registrado para device ${msg.device_id}`);
      } else if (msg.status === 'online') {
        this.logger.log(`Device ${msg.device_id} online`);
      } else if (msg.status === 'offline') {
        this.logger.log(`Device ${msg.device_id} offline (LWT)`);
      }
    } catch (err) {
      this.logger.error('Error procesando status MQTT', err);
    }
  }

  private handleMessage(topic: string, payload: Buffer) {
    if (topic === 'growbox/status') {
      void this.handleStatusMessage(payload);
      return;
    }

    try {
      const message = JSON.parse(payload.toString()) as Record<string, any>;
      const parts = topic.split('/');

      // Telemetría de sensores: growbox/<alias>/data
      if (parts.length >= 3 && parts[2] === 'data') {
        const sensorAlias = parts[1];
        void this.telemetryService.ingest(
          sensorAlias,
          message as TelemetryMessage,
        );
        return;
      }

      // Estado de relés: growbox/relay/<channel>/state
      if (parts.length >= 4 && parts[1] === 'relay' && parts[3] === 'state') {
        const channel = parseInt(parts[2], 10);
        const state = message.state as string;
        void this.updateRelayState(channel, state);
        return;
      }

      // NUEVO: Respuesta de configuración de sensor: growbox/<alias>/config
      if (parts.length === 3 && parts[2] === 'config') {
        const sensorAlias = parts[1];
        void this.handleConfigResponse(sensorAlias, message);
        return;
      }

      this.logger.warn(`Topic no reconocido: ${topic}`);
    } catch (err) {
      this.logger.error('Error al parsear mensaje MQTT', err);
    }
  }

  /**
   * Procesa la confirmación de configuración de un sensor enviada por el ESP32.
   * Si la configuración es diferente a la última guardada, inserta una nueva versión.
   */
  private async handleConfigResponse(
    alias: string,
    config: Record<string, unknown>,
  ) {
    try {
      // 1. Intentar como sensor
      const sensor = await this.db.execute<{ id: number }>(sql`
      SELECT id FROM sensors WHERE alias = ${alias} LIMIT 1
    `);
      if (sensor.rows.length) {
        const sensorId = sensor.rows[0].id;
        const latest = await this.db.execute<{
          config: any;
          version: number;
        }>(sql`
        SELECT config, version
        FROM sensor_configs
        WHERE sensor_id = ${sensorId}
        ORDER BY version DESC
        LIMIT 1
      `);
        const newConfigStr = JSON.stringify(config);
        if (
          latest.rows.length > 0 &&
          JSON.stringify(latest.rows[0].config) === newConfigStr
        ) {
          this.logger.debug(`Config de sensor ${alias} sin cambios`);
          return;
        }
        const newVersion = latest.rows.length ? latest.rows[0].version + 1 : 1;
        await this.db.execute(sql`
        INSERT INTO sensor_configs (sensor_id, config, version)
        VALUES (${sensorId}, ${newConfigStr}::jsonb, ${newVersion})
      `);
        this.logger.log(`Configuración de sensor ${alias} v${newVersion}`);
        return;
      }

      // 2. Intentar como actuador (la alias será el tipo, ej. 'relay')
      const actuator = await this.db.execute<{ id: number }>(sql`
      SELECT id FROM actuators WHERE type = ${alias} LIMIT 1
    `);
      if (actuator.rows.length) {
        const actuatorId = actuator.rows[0].id;
        const latest = await this.db.execute<{
          config: any;
          version: number;
        }>(sql`
        SELECT config, version
        FROM actuator_configs
        WHERE actuator_id = ${actuatorId}
        ORDER BY version DESC
        LIMIT 1
      `);
        const newConfigStr = JSON.stringify(config);
        if (
          latest.rows.length > 0 &&
          JSON.stringify(latest.rows[0].config) === newConfigStr
        ) {
          this.logger.debug(`Config de actuador ${alias} sin cambios`);
          return;
        }
        const newVersion = latest.rows.length ? latest.rows[0].version + 1 : 1;
        await this.db.execute(sql`
        INSERT INTO actuator_configs (actuator_id, config, version)
        VALUES (${actuatorId}, ${newConfigStr}::jsonb, ${newVersion})
      `);
        this.logger.log(`Configuración de actuador ${alias} v${newVersion}`);
        return;
      }

      this.logger.warn(`Destinatario de config desconocido: ${alias}`);
    } catch (err) {
      this.logger.error(`Error al guardar config de ${alias}`, err);
    }
  }

  private async updateRelayState(channel: number, state: string) {
    if (channel < 1 || channel > 4) {
      this.logger.warn(`Canal de relé inválido: ${channel}`);
      return;
    }

    const actuator = await this.db.execute<{ id: number; state: unknown }>(sql`
    SELECT id, state FROM actuators
    WHERE name = ${`canal_${channel}`} AND type = 'relay' LIMIT 1
  `);

    if (!actuator.rows.length) {
      this.logger.warn(`Actuador canal_${channel} no encontrado`);
      return;
    }

    const actuatorId = actuator.rows[0].id;
    const currentState = (actuator.rows[0].state as Record<string, any>) || {};

    // Estado simple para un solo canal
    const newState = { state };

    await this.db.execute(sql`
    UPDATE actuators SET state = ${JSON.stringify(newState)}::jsonb
    WHERE id = ${actuatorId}
  `);

    await this.db.execute(sql`
    INSERT INTO actuator_events (actuator_id, old_state, new_state, reason)
    VALUES (
      ${actuatorId},
      ${JSON.stringify(currentState)}::jsonb,
      ${JSON.stringify(newState)}::jsonb,
      'mqtt_state_update'
    )
  `);

    this.logger.log(
      `Relé canal ${channel} (canal_${channel}) actualizado a ${state}`,
    );
  }

  publish(topic: string, payload: string): boolean {
    if (!this.client || !this.client.connected) {
      this.logger.warn('Cliente MQTT no conectado');
      return false;
    }
    return this.client.publish(topic, payload) !== undefined;
  }

  requestSensorRead(sensorAlias: string): void {
    const topic = `growbox/${sensorAlias}/read`;
    this.publish(topic, '{}');
    this.logger.log(`Comando READ enviado a ${topic}`);
  }

  sendSensorConfig(sensorAlias: string, config: any): void {
    const topic = `growbox/${sensorAlias}/config`;
    const payload = JSON.stringify(config);
    this.publish(topic, payload);
    this.logger.log(`Configuración enviada a ${topic}`);
  }

  sendActuatorCommand(
    actuatorType: string,
    command: string,
    payload: any,
  ): void {
    const topic = `growbox/${actuatorType}/${command}`;
    this.publish(topic, JSON.stringify(payload));
    this.logger.log(`Comando enviado a ${topic}`);
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(false, {}, () => {
        this.logger.log('Conexión MQTT cerrada');
      });
    }
  }
}
