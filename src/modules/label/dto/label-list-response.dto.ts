import { ApiProperty } from '@nestjs/swagger';
import { LabelResponseDto } from './label-response.dto';

export class LabelListResponseDto {
  @ApiProperty({ type: LabelResponseDto, isArray: true })
  data: LabelResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
