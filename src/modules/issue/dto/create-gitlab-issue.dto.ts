import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateGitlabIssueDto {
  @ApiPropertyOptional({
    description: 'Assigned user id. If missing, fallback to caller.',
    type: Number
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignId?: number;
}
