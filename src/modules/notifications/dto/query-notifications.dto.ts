import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ToOptionalBool } from '../../../common/pipes/parse-optional-bool';

export class QueryNotificationsDto {
  @ApiPropertyOptional({ description: 'Only return unread notifications ("true"/"false"/"1"/"0")' })
  @IsOptional()
  @ToOptionalBool()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
