import { Module, Global } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';

@Global()
@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
  controllers: [TelemetryController],
})
export class TelemetryModule {}
