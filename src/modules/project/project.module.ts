import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleSheetsClient } from '../../clients/google-sheets/google-sheets.client';
import { GitlabApiClient } from '../../clients/gitlab/gitlab-api.client';
import { ProjectEntity } from '../../entities/project.entity';
import { SpreadsheetSheetEntity } from '../../entities/spreadsheet-sheet.entity';
import { UserEntity } from '../../entities/user.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([ProjectEntity, UserEntity, SpreadsheetSheetEntity])],
  controllers: [ProjectController],
  providers: [ProjectService, GitlabApiClient, GoogleSheetsClient],
  exports: [ProjectService]
})
export class ProjectModule {}
