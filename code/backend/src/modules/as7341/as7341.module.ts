import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MqttModule } from '../../mqtt/mqtt.module';
import { As7341Controller } from './as7341.controller';
import { As7341Service } from './as7341.service';
import { As7341ConfigEntity } from './entities/as7341-config.entity';
import { As7341ReadingEntity } from './entities/as7341-reading.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([As7341ReadingEntity, As7341ConfigEntity]),
    MqttModule,
  ],
  controllers: [As7341Controller],
  providers: [As7341Service],
  exports: [As7341Service],
})
export class As7341Module {}
