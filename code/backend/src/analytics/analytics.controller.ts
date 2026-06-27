/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':alias/:metricName')
  @ApiOperation({ summary: 'Obtener métricas derivadas de un sensor' })
  @ApiParam({ name: 'alias', example: 'as7341' })
  @ApiParam({ name: 'metricName', example: 'ndvi' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  async getDerived(
    @Param('alias') alias: string,
    @Param('metricName') metricName: string,
    @Query('limit') limit = 100,
  ) {
    return this.analyticsService.getDerived(alias, metricName, +limit);
  }
}
