import { ApiProperty } from '@nestjs/swagger';

export class IssueResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  spreadsheetId: string;

  @ApiProperty()
  sheetName: string;

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
