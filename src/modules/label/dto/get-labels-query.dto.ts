import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../issue/dto/get-issues-query.dto';

export class GetLabelsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by partial match on nameJp or nameEn (case-insensitive)',
    example: 'bug'
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
