import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { TelemetryReadingDto } from './dto/telemetry-response.dto';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get(':alias/latest')
  @ApiOperation({ summary: 'Obtener últimas lecturas de un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Lista de lecturas recientes',
    type: [TelemetryReadingDto],
  })
  async latest(@Param('alias') alias: string, @Query('limit') limit = 10) {
    return this.telemetryService.getLatest(alias, +limit);
  }
}
