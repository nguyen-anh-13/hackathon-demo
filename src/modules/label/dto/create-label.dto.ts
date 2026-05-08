import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ example: 'バグ', description: 'Label text in Japanese' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_jp: string;

  @ApiProperty({ example: 'Bug', description: 'Label text in English' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name_en: string;
}
