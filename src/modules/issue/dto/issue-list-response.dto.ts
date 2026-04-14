import { ApiProperty } from '@nestjs/swagger';
import { IssueResponseDto } from './issue-response.dto';

export class IssueListResponseDto {
  @ApiProperty({ type: IssueResponseDto, isArray: true })
  data: IssueResponseDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}
