import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfigureCourseDripDto {
  @ApiProperty({ description: 'Whether drip scheduling is enabled', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Days between lesson unlocks', example: 7, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  dripIntervalDays?: number;
}
