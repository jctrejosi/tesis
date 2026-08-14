import { ApiProperty } from '@nestjs/swagger';

export class TelemetryReadingDto {
  @ApiProperty({ example: '2026-06-23T10:15:30.123Z' })
  time!: string;

  @ApiProperty({ example: 'f1_415nm' })
  metric_name!: string;

  @ApiProperty({ example: 1234.5 })
  value!: number;
}
