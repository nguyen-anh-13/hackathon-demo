import { Column, Entity, OneToMany } from 'typeorm';
import { AppBaseEntity } from './base.entity';
import { IssueEntity } from './issue.entity';
  
@Entity({ name: 'users' })
export class UserEntity extends AppBaseEntity {
  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  state: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @OneToMany(() => IssueEntity, (issue) => issue.assignedTo)
  issues: IssueEntity[]; 
}
