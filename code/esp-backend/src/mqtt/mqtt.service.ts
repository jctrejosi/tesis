import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { TelemetryService } from '../telemetry/telemetry.service';
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
    });

    client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    client.on('error', (err) => {
      this.logger.error('Error de conexión MQTT', err);
    });
  }

  private handleMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString()) as Record<string, any>;
      const parts = topic.split('/');

      // Telemetría de sensores: growbox/<alias>/data
      if (parts.length >= 3 && parts[2] === 'data') {
        const sensorAlias = parts[1];
        void this.telemetryService.ingest(sensorAlias, message as any);
        return;
      }

      // Estado de relés: growbox/relay/<channel>/state
      if (parts.length >= 4 && parts[1] === 'relay' && parts[3] === 'state') {
        const channel = parseInt(parts[2], 10);
        const state = message.state as string;
        void this.updateRelayState(channel, state);
        return;
      }

      this.logger.warn(`Topic no reconocido: ${topic}`);
    } catch (err) {
      this.logger.error('Error al parsear mensaje MQTT', err);
    }
  }

  private async updateRelayState(channel: number, state: string) {
    if (channel < 1 || channel > 4) {
      this.logger.warn(`Canal de relé inválido: ${channel}`);
      return;
    }

    // Buscar el actuador de tipo relay (asumimos que hay uno llamado "relay_principal")
    const actuator = await this.db.execute(sql`
      SELECT id, state FROM actuators WHERE name = 'relay_principal' AND type = 'relay' LIMIT 1
    `);

    if (!actuator.rows.length) {
      this.logger.warn('Actuador relay_principal no encontrado');
      return;
    }

    const actuatorId = actuator.rows[0].id as number;
    const currentState = (actuator.rows[0].state as Record<string, any>) || {};

    // Actualizar el estado del canal específico
    const newState = {
      ...currentState,
      [`channel_${channel}`]: state,
    };

    await this.db.execute(sql`
      UPDATE actuators SET state = ${JSON.stringify(newState)}::jsonb
      WHERE id = ${actuatorId}
    `);

    // Registrar evento
    await this.db.execute(sql`
      INSERT INTO actuator_events (actuator_id, old_state, new_state, reason)
      VALUES (
        ${actuatorId},
        ${JSON.stringify(currentState)}::jsonb,
        ${JSON.stringify(newState)}::jsonb,
        'mqtt_state_update'
      )
    `);

    this.logger.log(`Relé canal ${channel} actualizado a ${state}`);
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
