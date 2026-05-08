import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SheetResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Tab name as shown in Google Sheets' })
  sheetName: string;

  @ApiProperty({ description: 'Google Sheets internal numeric sheet ID (stable across renames)' })
  sheetId: number;
}

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

  @ApiPropertyOptional({ nullable: true, description: 'Spreadsheet ID of the sync destination file' })
  syncSpreadsheetId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Assignee `users.id`' })
  assignedToId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  teamUrl?: string | null;

  @ApiPropertyOptional({ type: [SheetResponseDto], description: 'Sheet tabs in the spreadsheet' })
  sheets?: SheetResponseDto[];
}
