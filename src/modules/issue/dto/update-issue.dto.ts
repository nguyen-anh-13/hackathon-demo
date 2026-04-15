import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateIssueDto {
  @ApiPropertyOptional({ description: 'Issue title (max 255 chars)', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Translated issue body text' })
  @IsOptional()
  @IsString()
  translatedContent?: string;

  @ApiPropertyOptional({
    description: 'Assignee: internal user primary key (`users.id`), same as create GitLab issue body `assignId`'
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignId?: number;
}
