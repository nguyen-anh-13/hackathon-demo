import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CREATE_GITLAB_TICKET_JOB, GITLAB_TICKET_QUEUE } from './webhooks.constants';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(@InjectQueue(GITLAB_TICKET_QUEUE) private readonly gitlabTicketQueue: Queue) {}

  async handleGoogleSheetsWebhook(payload: unknown): Promise<void> {
    await this.gitlabTicketQueue.add(
      CREATE_GITLAB_TICKET_JOB,
      {
        payload
      },
      {
        attempts: 3,
        removeOnComplete: true
      }
    );

    this.logger.log('Webhook job enqueued for GitLab issue creation');
  }
}
