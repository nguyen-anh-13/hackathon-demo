import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 77 })
  @IsInt()
  project_id: number;

  @ApiProperty({ example: 'hackathon' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example:
      'https://docs.google.com/spreadsheets/d/1QjWLJqxX2CNogPmo_z-RbgUJAaoZOhUGrtFdXIuBn6o/edit?gid=0#gid=0'
  })
  @IsString()
  @MaxLength(2048)
  excelUrl: string;

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
