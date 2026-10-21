import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OverrideInstructorDripDto {
  @ApiPropertyOptional({ description: 'Specific lesson to override (omit for bulk override)', example: 'lesson-uuid-1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lessonId?: string;

  @ApiPropertyOptional({
    description: 'ISO date to unlock at (defaults to now)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  unlockAt?: string;
}
