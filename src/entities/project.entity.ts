import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { IssueEntity } from './issue.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'projects' })
export class ProjectEntity extends AppBaseEntity {
  @Column({ name: 'project_id', type: 'int' })
  project_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'spreadsheet_id', type: 'varchar', length: 255 })
  spreadsheetId: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: UserEntity | null;

  @Column({ name: 'team_url', type: 'varchar', length: 1024, nullable: true })
  teamUrl: string | null;

  @OneToMany(() => IssueEntity, (issue) => issue.project)
  issues: IssueEntity[];
}