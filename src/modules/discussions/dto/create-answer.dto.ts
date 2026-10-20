import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnswerDto {
  @ApiProperty({ description: 'Answer body', minLength: 2, maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(5000)
  content: string;
}
