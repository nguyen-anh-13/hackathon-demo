import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { CreateGitlabTicketPayload } from './gitlab-ticket.processor';
import { GITLAB_TICKET_QUEUE, UPSERT_ISSUE_FROM_SHEET_JOB } from './webhooks.constants';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue(GITLAB_TICKET_QUEUE)
    private readonly gitlabTicketQueue: Queue,
  ) {}

  async handleGoogleSheetsWebhook(payload: unknown): Promise<void> {
    await this.gitlabTicketQueue.add(
      UPSERT_ISSUE_FROM_SHEET_JOB,
      { payload: (payload ?? {}) as CreateGitlabTicketPayload['payload'] },
      { attempts: 3, removeOnComplete: true },
    );

    this.logger.log('Webhook: sheet issue enqueued');
  }
}
