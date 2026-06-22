import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { randomUUID } from 'crypto';

import { mqttEvents } from './mqtt.events';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: MqttClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('MQTT_HOST', 'localhost');
    const port = Number(this.config.get<string>('MQTT_PORT', '1883'));
    const username = this.config.get<string>('MQTT_USERNAME') || undefined;
    const password = this.config.get<string>('MQTT_PASSWORD') || undefined;
    const clientId =
      this.config.get<string>('MQTT_CLIENT_ID') ??
      `nest-growbox-${randomUUID().slice(0, 8)}`;

    this.client = connect({
      host,
      port,
      username,
      password,
      clientId,
      reconnectPeriod: 5000,
      keepalive: 30,
      clean: true,
    });

    this.client.on('connect', () => {
      this.logger.log('MQTT conectado');

      this.client?.subscribe('growbox/as7341/#', (error) => {
        if (error) {
          this.logger.error(`Error suscribiendo AS7341: ${error.message}`);
          return;
        }

        this.logger.log('Suscrito a growbox/as7341/#');
      });
    });

    this.client.on('reconnect', () => {
      this.logger.warn('MQTT reconectando...');
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });

    this.client.on('message', (topic, payload) => {
      const message = payload.toString();

      if (topic === 'growbox/as7341/data') {
        mqttEvents.emit('as7341.data', message);
      }
    });
  }

  async onModuleDestroy() {
    if (!this.client) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.client?.end(false, {}, () => resolve());
    });
  }

  async publish(
    topic: string,
    payload: string | Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      this.logger.warn(`No se pudo publicar en ${topic}: MQTT desconectado`);
      return false;
    }

    const message =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    return new Promise<boolean>((resolve) => {
      this.client?.publish(topic, message, { qos: 0 }, (error) => {
        if (error) {
          this.logger.error(`Error publicando en ${topic}: ${error.message}`);
          resolve(false);
          return;
        }

        resolve(true);
      });
    });
  }
}
