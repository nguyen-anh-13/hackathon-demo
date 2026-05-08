import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { GeminiApiClient } from '../../clients/gemini/gemini-api.client';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GITLAB_TICKET_QUEUE, TEAMS_NOTIFICATION_QUEUE } from './webhooks.constants';
import { GitlabIssueService, SakuraGitlabService } from './gitlab.service';
import { GitlabTicketProcessor } from './gitlab-ticket.processor';
import { GeminiService } from './gemini.service';
import { TeamsNotificationProcessor } from './teams-notification.processor';
import { TeamsWorkflowService } from './teams-workflow.service';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import { GoogleSheetsClient } from '../../clients/google-sheets/google-sheets.client';
import { SpreadsheetSyncService } from '../spreadsheet-sync/spreadsheet-sync.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([IssueEntity, ProjectEntity]),
    BullModule.registerQueue(
      { name: GITLAB_TICKET_QUEUE },
      { name: TEAMS_NOTIFICATION_QUEUE }
    )
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    GeminiApiClient,
    GeminiService,
    SakuraGitlabService,
    {
      provide: GitlabIssueService,
      useExisting: SakuraGitlabService
    },
    GitlabTicketProcessor,
    TeamsWorkflowService,
    TeamsNotificationProcessor,
    GoogleSheetsClient,
    SpreadsheetSyncService,
  ],
  exports: [SakuraGitlabService, GitlabTicketProcessor, GeminiService, TeamsWorkflowService]
})
export class WebhooksModule {}
