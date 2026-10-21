import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfigureLessonDripDto {
  @ApiPropertyOptional({ description: 'Days after enrollment before this lesson unlocks', example: 3, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  delayDays?: number;

  @ApiPropertyOptional({
    description: 'Absolute ISO date when this lesson unlocks',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  unlockDate?: string | Date;
}
