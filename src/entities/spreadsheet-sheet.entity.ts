import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { ProjectEntity } from './project.entity';

@Entity({ name: 'spreadsheet_sheets' })
export class SpreadsheetSheetEntity extends AppBaseEntity {
  @ManyToOne(() => ProjectEntity, (project) => project.sheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ name: 'sheet_name', type: 'varchar', length: 255 })
  sheetName: string;

  /** Google Sheets internal numeric ID — stable even if the tab is renamed. */
  @Column({ name: 'sheet_id', type: 'int' })
  sheetId: number;
}
