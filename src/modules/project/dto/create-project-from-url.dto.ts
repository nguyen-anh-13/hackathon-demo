import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProjectFromUrlDto {
  @ApiProperty({
    description: 'Google Sheets URL of the source spreadsheet',
    example: 'https://docs.google.com/spreadsheets/d/1QjWLJqxX2CNogPmo_z-RbgUJAaoZOhUGrtFdXIuBn6o/edit?gid=0#gid=0',
  })
  @IsString()
  @MaxLength(2048)
  excelUrl: string;

  @ApiPropertyOptional({
    description: 'Google Sheets URL of the destination spreadsheet to sync translated data into',
    example: 'https://docs.google.com/spreadsheets/d/1-JryLHgOHWjadlyuYS9SzwM4Yj8y2ieeQ8uLeqj16sU/edit?gid=0#gid=0',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  syncUrl?: string;

  @ApiPropertyOptional({
    description: 'Project name override. If omitted, the spreadsheet title is used.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'GitLab project ID. Defaults to 0 if not provided.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  project_id?: number;

  @ApiPropertyOptional({ description: 'Assignee internal id (`users.id`)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTo?: number;

  @ApiPropertyOptional({ description: 'Teams channel or group URL' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  teamUrl?: string;
}
