import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  project_id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  spreadsheetId: string;

  @ApiPropertyOptional({ nullable: true, description: 'Assignee `users.id`' })
  assignedToId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  teamUrl?: string | null;
}
