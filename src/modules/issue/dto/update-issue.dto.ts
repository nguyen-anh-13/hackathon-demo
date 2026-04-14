import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
