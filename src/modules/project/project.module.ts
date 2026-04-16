import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitlabApiClient } from '../../clients/gitlab/gitlab-api.client';
import { ProjectEntity } from '../../entities/project.entity';
import { UserEntity } from '../../entities/user.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([ProjectEntity, UserEntity])],
  controllers: [ProjectController],
  providers: [ProjectService, GitlabApiClient],
  exports: [ProjectService]
})
export class ProjectModule {}
