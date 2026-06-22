import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MqttService } from '../../mqtt/mqtt.service';
import { mqttEvents } from '../../mqtt/mqtt.events';
import { AS7341_DEFAULT_CONFIG, AS7341_TOPICS } from './as7341.constants';
import { UpdateAs7341ConfigDto } from './dto/update-as7341-config.dto';
import { As7341ReadingEntity } from './entities/as7341-reading.entity';
import { As7341ConfigEntity } from './entities/as7341-config.entity';

type As7341Payload = Record<string, unknown>;

@Injectable()
export class As7341Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(As7341Service.name);

  private readonly onTelemetry = async (raw: string) => {
    await this.saveTelemetry(raw);
  };

  // wrapper that ensures a void return for event listeners
  private readonly telemetryHandler = (raw: string) => {
    void this.onTelemetry(raw);
  };

  constructor(
    @InjectRepository(As7341ReadingEntity)
    private readonly readingRepo: Repository<As7341ReadingEntity>,

    @InjectRepository(As7341ConfigEntity)
    private readonly configRepo: Repository<As7341ConfigEntity>,

    private readonly mqtt: MqttService,
  ) {}

  async onModuleInit() {
    mqttEvents.on('as7341.data', this.telemetryHandler);
    await this.ensureDefaultConfig();
  }

  onModuleDestroy() {
    mqttEvents.off('as7341.data', this.telemetryHandler);
  }

  async requestRead() {
    return this.mqtt.publish(AS7341_TOPICS.read, '1');
  }

  async updateConfig(dto: UpdateAs7341ConfigDto) {
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'No enviaste ningún campo de configuración',
      );
    }

    const current = await this.getConfigEntity();

    const next = this.configRepo.create({
      ...current,
      ...dto,
      sensor: 'as7341',
    });

    const saved = await this.configRepo.save(next);

    const payload = {
      interval_ms: saved.interval_ms,
      simulation: saved.simulation,
      atime: saved.atime,
      astep: saved.astep,
      gain: saved.gain,
      led_enabled: saved.led_enabled,
      led_current_ma: saved.led_current_ma,
    };

    await this.mqtt.publish(AS7341_TOPICS.config, payload);

    return saved;
  }

  async getConfig() {
    return this.getConfigEntity();
  }

  async getLatest() {
    return this.readingRepo.findOne({
      order: {
        received_at: 'DESC',
      },
    });
  }

  async getHistory(limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 1), 500);

    return this.readingRepo.find({
      take: safeLimit,
      order: {
        received_at: 'DESC',
      },
    });
  }

  private async ensureDefaultConfig() {
    const existing = await this.configRepo.findOneBy({ sensor: 'as7341' });

    if (existing) {
      return existing;
    }

    const created = this.configRepo.create({
      sensor: 'as7341',
      ...AS7341_DEFAULT_CONFIG,
    });

    return this.configRepo.save(created);
  }

  private async getConfigEntity() {
    const current = await this.configRepo.findOneBy({ sensor: 'as7341' });

    if (current) {
      return current;
    }

    return this.ensureDefaultConfig();
  }

  private async saveTelemetry(raw: string) {
    let parsed: As7341Payload;

    try {
      parsed = JSON.parse(raw) as As7341Payload;
    } catch {
      this.logger.warn('Payload JSON inválido en AS7341');
      return null;
    }

    const entity = this.readingRepo.create({
      f1_415nm: Number(parsed['f1_415nm'] ?? 0),
      f2_445nm: Number(parsed['f2_445nm'] ?? 0),
      f3_480nm: Number(parsed['f3_480nm'] ?? 0),
      f4_515nm: Number(parsed['f4_515nm'] ?? 0),
      f5_555nm: Number(parsed['f5_555nm'] ?? 0),
      f6_590nm: Number(parsed['f6_590nm'] ?? 0),
      f7_630nm: Number(parsed['f7_630nm'] ?? 0),
      f8_680nm: Number(parsed['f8_680nm'] ?? 0),
      clear: Number(parsed['clear'] ?? 0),
      nir: Number(parsed['nir'] ?? 0),
      raw_payload: parsed,
    });

    return this.readingRepo.save(entity);
  }
}
