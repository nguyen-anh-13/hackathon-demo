import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import {
  CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB,
  CREATE_GITLAB_TICKET_JOB,
  GITLAB_TICKET_QUEUE
} from './webhooks.constants';
import { IssueEntity } from '../../entities/issue.entity';
import { GeminiService } from './gemini.service';
import { SakuraGitlabService } from './gitlab.service';

type CreateGitlabTicketPayload = {
  payload: {
    spreadsheetId?: string;
    sheetName?: string;
    changedCell?: {
      row?: number;
      col?: number;
      value?: string;
    };
    allRowData?: unknown[];
    timestamp?: string;
  };
};

type CreateGitlabIssueFromIssuePayload = {
  issueId: number;
  gitlabAssignId?: number;
};

@Processor(GITLAB_TICKET_QUEUE)
export class GitlabTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(GitlabTicketProcessor.name);

  constructor(
    @InjectRepository(IssueEntity) private readonly issueRepository: Repository<IssueEntity>,
    private readonly geminiService: GeminiService,
    private readonly sakuraGitlabService: SakuraGitlabService
  ) {
    super();
  }

  async process(job: Job<CreateGitlabTicketPayload | CreateGitlabIssueFromIssuePayload>): Promise<void> {
    if (job.name === CREATE_GITLAB_TICKET_JOB) {
      await this.createIssueRecord((job.data as CreateGitlabTicketPayload).payload);
      this.logger.log(`Issue record saved for job ${job.id}`);
      return;
    }

    if (job.name === CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB) {
      await this.createGitlabIssueFromIssue(job.data as CreateGitlabIssueFromIssuePayload);
      this.logger.log(`GitLab issue created from stored issue for job ${job.id}`);
      return;
    }

    this.logger.warn(`Unknown job name: ${job.name}`);
  }

  private async createIssueRecord(payload: CreateGitlabTicketPayload['payload']): Promise<void> {
    const row = Array.isArray(payload?.allRowData) ? payload.allRowData : [];
    const spreadsheetId = String(payload?.spreadsheetId ?? '');
    const sheetName = String(payload?.sheetName ?? '');
    const issueNumber = Number(row[2] ?? 0);
    const translatedContent = await this.geminiService.translateText(String(row[12] ?? ''));

    const existingIssue = await this.issueRepository.findOne({
      where: {
        spreadsheetId,
        sheetName,
        number: issueNumber
      }
    });

    if (existingIssue) {
      existingIssue.is_resolved = Boolean(row[0] ?? false);
      existingIssue.status = String(row[3] ?? '');
      existingIssue.priority = String(row[4] ?? '');
      existingIssue.type = String(row[5] ?? '');
      existingIssue.big_category = String(row[9] ?? '');
      existingIssue.small_category = String(row[10] ?? '');
      existingIssue.originalContent = String(row[12] ?? '');
      existingIssue.translatedContent = translatedContent;
      await this.issueRepository.save(existingIssue);
      return;
    }

    const issue = this.issueRepository.create({
      spreadsheetId,
      sheetName,
      is_resolved: Boolean(row[0] ?? false),
      number: issueNumber,
      status: String(row[3] ?? ''),
      priority: String(row[4] ?? ''),
      type: String(row[5] ?? ''),
      big_category: String(row[9] ?? ''),
      small_category: String(row[10] ?? ''),
      originalContent: String(row[12] ?? ''),
      translatedContent,
      created_at: new Date(String(row[7] ?? '')),
    });

    await this.issueRepository.save(issue);
  }

  private async createGitlabIssueFromIssue(payload: CreateGitlabIssueFromIssuePayload): Promise<void> {
    const issueId = Number(payload?.issueId ?? 0);
    if (!issueId) {
      throw new NotFoundException('Issue id is required');
    }

    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    const gitlabUserId = payload.gitlabAssignId;

    const gitlabResponse = await this.sakuraGitlabService.createIssueFromWebhook(issueId, gitlabUserId);
    issue.url = String((gitlabResponse as { web_url?: string })?.web_url ?? '');
    await this.issueRepository.save(issue);
  }
}
