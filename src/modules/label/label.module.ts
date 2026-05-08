import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabelEntity } from '../../entities/label.entity';
import { LabelController } from './label.controller';
import { LabelService } from './label.service';

@Module({
  imports: [TypeOrmModule.forFeature([LabelEntity])],
  controllers: [LabelController],
  providers: [LabelService],
  exports: [LabelService]
})
export class LabelModule {}
