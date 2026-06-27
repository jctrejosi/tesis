import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DerivatesService } from './derivates.service';

@ApiTags('Derivates')
@Controller('Derivates')
export class DerivatesController {
  constructor(private readonly DerivatesService: DerivatesService) {}

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
    return this.DerivatesService.getDerived(alias, metricName, +limit);
  }
}
