import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IssueResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'GitLab/business project id from linked `projects.project_id`'
  })
  project_id: number | null;

  @ApiProperty()
  spreadsheetId: string;

  @ApiProperty()
  sheetName: string;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty()
  is_resolved: boolean;

  @ApiProperty()
  number: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  big_category: string;

  @ApiProperty()
  small_category: string;

  @ApiProperty()
  originalContent: string;

  @ApiProperty()
  translatedContent: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
