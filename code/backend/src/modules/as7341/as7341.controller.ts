import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { As7341Service } from './as7341.service';
import { UpdateAs7341ConfigDto } from './dto/update-as7341-config.dto';

@Controller('as7341')
export class As7341Controller {
  constructor(private readonly as7341Service: As7341Service) {}

  @Get('latest')
  getLatest() {
    return this.as7341Service.getLatest();
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : 50;
    return this.as7341Service.getHistory(parsed);
  }

  @Get('config')
  getConfig() {
    return this.as7341Service.getConfig();
  }

  @Post('read')
  @HttpCode(202)
  requestRead() {
    return this.as7341Service.requestRead();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateAs7341ConfigDto) {
    return this.as7341Service.updateConfig(dto);
  }
}
