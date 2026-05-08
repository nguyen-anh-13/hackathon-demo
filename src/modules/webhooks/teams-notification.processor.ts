import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFY_TEAMS_ISSUE_JOB, TEAMS_NOTIFICATION_QUEUE } from './webhooks.constants';
import { TeamsIssueNotificationPayload, TeamsWorkflowService } from './teams-workflow.service';

@Processor(TEAMS_NOTIFICATION_QUEUE)
export class TeamsNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(TeamsNotificationProcessor.name);

  constructor(private readonly teamsWorkflowService: TeamsWorkflowService) {
    super();
  }

  async process(job: Job<TeamsIssueNotificationPayload>): Promise<void> {
    if (job.name !== NOTIFY_TEAMS_ISSUE_JOB) {
      this.logger.warn(`Unknown job name on Teams queue: ${job.name}`);
      return;
    }
    await this.teamsWorkflowService.sendIssueNotification(job.data);
  }
}
