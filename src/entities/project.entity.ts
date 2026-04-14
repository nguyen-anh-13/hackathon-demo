import { Column, Entity, OneToMany } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { IssueEntity } from './issue.entity';

@Entity({ name: 'projects' })
export class ProjectEntity extends AppBaseEntity {
  @Column({ name: 'project_id', type: 'int' })
  project_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'spreadsheet_id', type: 'varchar', length: 255 })
  spreadsheetId: string;

  @OneToMany(() => IssueEntity, (issue) => issue.project)
  issues: IssueEntity[];
}