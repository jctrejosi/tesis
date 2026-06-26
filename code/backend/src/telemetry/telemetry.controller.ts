import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get(':alias/readings')
  @ApiOperation({ summary: 'Últimas N lecturas agrupadas del sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  getReadings(@Param('alias') alias: string, @Query('limit') limit = 10) {
    return this.telemetryService.getReadings(alias, +limit);
  }

  @Get(':alias/latest')
  @ApiOperation({
    summary: 'Últimas N lecturas de un sensor (todas las métricas)',
  })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getLatest(@Param('alias') alias: string, @Query('limit') limit = 10) {
    return this.telemetryService.getLatest(alias, +limit);
  }

  @Get(':alias/current')
  @ApiOperation({ summary: 'Valor actual de cada métrica del sensor' })
  @ApiParam({ name: 'alias', example: 'bme680' })
  async getCurrent(@Param('alias') alias: string) {
    const result = await this.telemetryService.getCurrentValues(alias);
    return Array.isArray(result) ? result : result.rows;
  }

  @Get(':alias/metrics')
  @ApiOperation({ summary: 'Listar métricas disponibles para un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  async getMetrics(@Param('alias') alias: string) {
    const result = await this.telemetryService.getAvailableMetrics(alias);
    const rows = Array.isArray(result) ? result : result.rows;
    return rows
      .filter((r): r is { metric_name: string } => Boolean(r?.metric_name))
      .map((r) => r.metric_name);
  }

  @Get(':alias/metrics/:metricName')
  @ApiOperation({
    summary: 'Lecturas de una métrica específica en rango de tiempo',
  })
  @ApiParam({ name: 'alias', example: 'bme680' })
  @ApiParam({ name: 'metricName', example: 'temperature' })
  @ApiQuery({ name: 'start', required: true, example: '2026-06-23T00:00:00Z' })
  @ApiQuery({ name: 'end', required: true, example: '2026-06-23T23:59:59Z' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  async getMetricRange(
    @Param('alias') alias: string,
    @Param('metricName') metricName: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('limit') limit = 100,
  ) {
    const result = await this.telemetryService.getByTimeRange(
      alias,
      metricName,
      start,
      end,
      +limit,
    );
    const rows = Array.isArray(result)
      ? result
      : result && 'rows' in result
        ? result.rows
        : [];
    return rows;
  }

  @Get(':alias/metrics/:metricName/aggregated')
  @ApiOperation({ summary: 'Datos agregados por hora o día' })
  @ApiParam({ name: 'alias', example: 'bme680' })
  @ApiParam({ name: 'metricName', example: 'temperature' })
  @ApiQuery({
    name: 'bucket',
    required: false,
    example: '1 hour',
    enum: ['1 hour', '1 day'],
  })
  @ApiQuery({ name: 'start', required: true, example: '2026-06-20T00:00:00Z' })
  @ApiQuery({ name: 'end', required: true, example: '2026-06-23T23:59:59Z' })
  async getAggregated(
    @Param('alias') alias: string,
    @Param('metricName') metricName: string,
    @Query('bucket') bucket: '1 hour' | '1 day' = '1 hour',
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const result = await this.telemetryService.getAggregated(
      alias,
      metricName,
      bucket,
      start,
      end,
    );
    return Array.isArray(result) ? result : result.rows;
  }
}
