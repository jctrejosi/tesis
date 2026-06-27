import { Module, Global } from '@nestjs/common';
import { DerivatesService } from './derivates.service';
import { DerivatesController } from './derivates.controller';

@Global()
@Module({
  providers: [DerivatesService],
  exports: [DerivatesService],
  controllers: [DerivatesController],
})
export class DerivatesModule {}
