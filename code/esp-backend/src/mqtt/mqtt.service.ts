import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as mqtt from 'mqtt';
import { TelemetryService } from '../telemetry/telemetry.service';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;

  constructor(private readonly telemetryService: TelemetryService) {}

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
      // Suscribirse a todos los sensores
      client.subscribe('growbox/+/data', (err) => {
        if (err) {
          this.logger.error('Error al suscribirse a growbox/+/data', err);
        } else {
          this.logger.log('Suscrito a growbox/+/data');
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
      const message = JSON.parse(payload.toString()) as unknown;
      // Extraer el alias del sensor desde el topic: growbox/<alias>/data
      const parts = topic.split('/');
      if (parts.length >= 3) {
        const sensorAlias = parts[1];
        void this.telemetryService.ingest(sensorAlias, message as never);
      } else {
        this.logger.warn(`Topic no reconocido: ${topic}`);
      }
    } catch (err) {
      this.logger.error('Error al parsear mensaje MQTT', err);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(false, {}, () => {
        this.logger.log('Conexión MQTT cerrada');
      });
    }
  }
}
