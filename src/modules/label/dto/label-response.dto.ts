import { ApiProperty } from '@nestjs/swagger';

export class LabelResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ description: 'Label text in Japanese' })
  name_jp: string;

  @ApiProperty({ description: 'Label text in English' })
  name_en: string;
}
