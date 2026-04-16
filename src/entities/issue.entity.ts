import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'issues' })
export class IssueEntity extends AppBaseEntity {
  @Column({ name: 'spreadsheet_id', type: 'varchar', length: 255 })
  spreadsheetId: string;

  @Column({ name: 'sheet_name', type: 'varchar', length: 255 })
  sheetName: string;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  is_resolved: boolean;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'int', nullable: true })
  row: number | null;

  @Column({ type: 'int', nullable: true })
  col: number | null;

  @Column({ type: 'varchar', length: 255, default: '' })
  status: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  priority: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  type: string;

  @Column({ name: 'big_category', type: 'varchar', length: 255, default: '' })
  big_category: string;

  @Column({ name: 'small_category', type: 'varchar', length: 255, default: '' })
  small_category: string;

  @Column({ type: 'text', default: '' })
  originalContent: string;

  @Column({ type: 'text', default: '' })
  translatedContent: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  url: string;

  @Column({ name: 'is_sent', type: 'boolean', default: true })
  can_send: boolean;

  @ManyToOne(() => ProjectEntity, (project) => project.issues, { nullable: true })
  @JoinColumn({ name: 'project_id', referencedColumnName: 'id' })
  project: ProjectEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: UserEntity;
}
