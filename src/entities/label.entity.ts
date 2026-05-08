import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from './base.entity';

@Entity({ name: 'labels' })
export class LabelEntity extends AppBaseEntity {
  @Column({ name: 'name_jp', type: 'varchar', length: 255 })
  name_jp: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255 })
  name_en: string;
}
