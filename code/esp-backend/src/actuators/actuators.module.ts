import { Module } from '@nestjs/common';
import { ActuatorsController } from './actuators.controller';

@Module({
  controllers: [ActuatorsController],
})
export class ActuatorsModule {}
