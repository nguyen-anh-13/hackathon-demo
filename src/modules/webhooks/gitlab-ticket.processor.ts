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
import { ProjectEntity } from '../../entities/project.entity';
import { GeminiService } from './gemini.service';
import { SakuraGitlabService } from './gitlab.service';

export type CreateGitlabTicketPayload = {
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

export type CreateGitlabIssueFromIssuePayload = {
  issueId: number;
  gitlabAssignId?: number;
};

@Processor(GITLAB_TICKET_QUEUE)
export class GitlabTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(GitlabTicketProcessor.name);

  constructor(
    @InjectRepository(IssueEntity) private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(ProjectEntity) private readonly projectRepository: Repository<ProjectEntity>,
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

  /** Gọi trực tiếp thay cho enqueue `CREATE_GITLAB_TICKET_JOB` */
  async runCreateGitlabTicketFromWebhookPayload(payload: CreateGitlabTicketPayload['payload']): Promise<void> {
    await this.createIssueRecord(payload);
  }

  /** Gọi trực tiếp thay cho enqueue `CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB` */
  async runCreateGitlabIssueFromIssuePayload(data: CreateGitlabIssueFromIssuePayload): Promise<void> {
    await this.createGitlabIssueFromIssue(data);
  }

  private async createIssueRecord(payload: CreateGitlabTicketPayload['payload']): Promise<void> {
    const row = Array.isArray(payload?.allRowData) ? payload.allRowData : [];
    const spreadsheetId = String(payload?.spreadsheetId ?? '');
    const sheetName = String(payload?.sheetName ?? '');
    const issueNumber = Number(row[2] ?? 0);
    const translatedContent = await this.geminiService.translateText(String(row[12] ?? ''));
    const [status, priority, type, big_category] = await Promise.all([
      this.geminiService.translateText(String(row[3] ?? '')),
      this.geminiService.translateText(String(row[4] ?? '')),
      this.geminiService.translateText(String(row[5] ?? '')),
      this.geminiService.translateText(String(row[9] ?? ''))
    ]);
    const small_category = await this.translateSlashSeparated(String(row[10] ?? ''));

    const project = await this.resolveProjectBySpreadsheetId(spreadsheetId);

    const title = await this.sakuraGitlabService.buildStoredIssueTitle({
      number: issueNumber,
      big_category,
      small_category,
      translatedContent
    });

    const existingIssue = await this.issueRepository.findOne({
      where: {
        spreadsheetId,
        sheetName,
        number: issueNumber
      }
    });

    if (existingIssue) {
      existingIssue.is_resolved = Boolean(row[0] ?? false);
      existingIssue.status = status;
      existingIssue.priority = priority;
      existingIssue.type = type;
      existingIssue.big_category = big_category;
      existingIssue.small_category = small_category;
      existingIssue.originalContent = String(row[12] ?? '');
      existingIssue.translatedContent = translatedContent;
      existingIssue.title = title;
      existingIssue.project = project ?? null;
      await this.issueRepository.save(existingIssue);
      return;
    }

    const issue = this.issueRepository.create({
      spreadsheetId,
      sheetName,
      title,
      project: project ?? undefined,
      is_resolved: Boolean(row[0] ?? false),
      number: issueNumber,
      status,
      priority,
      type,
      big_category,
      small_category,
      originalContent: String(row[12] ?? ''),
      translatedContent,
      created_at: new Date(String(row[7] ?? ''))
    });

    await this.issueRepository.save(issue);
  }

  /** Each slash-separated segment is translated (JP → VI), then rejoined with `/`. */
  private async translateSlashSeparated(raw: string): Promise<string> {
    const text = String(raw ?? '').trim();
    if (!text) {
      return '';
    }
    const parts = await Promise.all(
      text.split('/').map((part) => this.geminiService.translateText(part.trim()))
    );
    return parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join('/');
  }

  private async resolveProjectBySpreadsheetId(spreadsheetId: string): Promise<ProjectEntity | null> {
    const trimmed = spreadsheetId.trim();
    if (!trimmed) {
      return null;
    }
    const found = await this.projectRepository.findOne({
      where: { spreadsheetId: trimmed }
    });
    if (!found) {
      this.logger.warn(`No project row for spreadsheet_id=${trimmed}; issue will have no project link`);
    }
    return found;
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

    const gitlabResponse = await this.sakuraGitlabService.createIssueGitLab(issueId, gitlabUserId);
    issue.url = String((gitlabResponse as { web_url?: string })?.web_url ?? '');
    issue.can_send = false;
    await this.issueRepository.save(issue);
  }
}
