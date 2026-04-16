import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ISSUE_PRIORITY_FILTER_VALUES = ['high', 'low', 'medium'] as const;
export type IssuePriorityFilter = (typeof ISSUE_PRIORITY_FILTER_VALUES)[number];

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class IssueFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'open' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by linked project business id (projects.project_id)',
    example: 77
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  project_id?: number;

  @ApiPropertyOptional({ enum: ISSUE_PRIORITY_FILTER_VALUES, description: 'Exact match (case-insensitive)' })
  @IsOptional()
  @IsString()
  @IsIn(ISSUE_PRIORITY_FILTER_VALUES)
  priority?: IssuePriorityFilter;
}
