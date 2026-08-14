import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { MqttModule } from './mqtt/mqtt.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SeedModule } from './seed/seed.module';
import { DevicesModule } from './devices/devices.module';
import { SensorsModule } from './sensors/sensors.module';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { ActuatorsModule } from './actuators/actuators.module';
import { DerivatesModule } from './derivates/derivates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SeedModule,
    MqttModule,
    TelemetryModule,
    DevicesModule,
    SensorsModule,
    AppConfigModule, // renombrado para no chocar con @nestjs/config
    ActuatorsModule,
    DerivatesModule,
    HealthModule,
  ],
})
export class AppModule {}
