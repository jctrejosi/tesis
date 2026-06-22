/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAs7341ConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(3600000)
  interval_ms?: number;

  @IsOptional()
  @IsBoolean()
  simulation?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  atime?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65534)
  astep?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(512)
  gain?: number;

  @IsOptional()
  @IsBoolean()
  led_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  led_current_ma?: number;
}
