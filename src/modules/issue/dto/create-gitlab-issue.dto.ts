import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateGitlabIssueDto {
  @ApiPropertyOptional({
    description: 'Assigned user id. If missing, fallback to caller.',
    type: Number
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignId?: number;

  @ApiPropertyOptional({ description: 'Override issue title before creating GitLab issue', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Override translated content before creating GitLab issue' })
  @IsOptional()
  @IsString()
  translatedContent?: string;
}
