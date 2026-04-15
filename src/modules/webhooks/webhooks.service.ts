import { Injectable, Logger } from '@nestjs/common';
import type { CreateGitlabTicketPayload } from './gitlab-ticket.processor';
import { GitlabTicketProcessor } from './gitlab-ticket.processor';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly gitlabTicketProcessor: GitlabTicketProcessor) {}

  async handleGoogleSheetsWebhook(payload: unknown): Promise<void> {
    // await this.gitlabTicketQueue.add(
    //   CREATE_GITLAB_TICKET_JOB,
    //   { payload },
    //   { attempts: 3, removeOnComplete: true }
    // );
    await this.gitlabTicketProcessor.runCreateGitlabTicketFromWebhookPayload(
      (payload ?? {}) as CreateGitlabTicketPayload['payload']
    );

    this.logger.log('Webhook: sheet issue saved (direct call, queue disabled)');
  }
}
