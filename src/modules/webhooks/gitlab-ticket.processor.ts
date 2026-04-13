import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CREATE_GITLAB_TICKET_JOB, GITLAB_TICKET_QUEUE } from './webhooks.constants';
import { GitlabIssueService } from './gitlab.service';

type CreateGitlabTicketPayload = {
  payload: unknown;
};

@Processor(GITLAB_TICKET_QUEUE)
export class GitlabTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(GitlabTicketProcessor.name);

  constructor(@Inject(GitlabIssueService) private readonly gitlabService: GitlabIssueService) {
    super();
  }

  async process(job: Job<CreateGitlabTicketPayload>): Promise<void> {
    if (job.name !== CREATE_GITLAB_TICKET_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    await this.gitlabService.createIssueFromWebhook(job.data.payload);
    this.logger.log(`GitLab issue created for job ${job.id}`);
  }
}
