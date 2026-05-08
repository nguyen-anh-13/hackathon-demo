import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLabelDto {
  @ApiPropertyOptional({ example: 'バグ', description: 'Label text in Japanese' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_jp?: string;

  @ApiPropertyOptional({ example: 'Bug', description: 'Label text in English' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en?: string;
}
