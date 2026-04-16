import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { env } from '../../configs/env.config';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import { GeminiService } from './gemini.service';
import { TeamsWorkflowService } from './teams-workflow.service';

@Injectable()
export abstract class GitlabIssueService {
  abstract createIssue(title: string, description: string, labels?: string[]): Promise<unknown>;
  abstract createIssueFromWebhook(issueId: number): Promise<unknown>;
}

abstract class BaseGitlabService extends GitlabIssueService {
  protected readonly logger = new Logger(BaseGitlabService.name);
  private readonly gitlabUrl = env.gitlab.apiUrl;
  private readonly apiToken = env.gitlab.apiToken;

  constructor(private readonly httpService: HttpService) {
    super();
  }

  protected abstract getProjectId(): string;

  async createIssueFromWebhook(issueId: number): Promise<unknown> {
    const title = `Google Sheets webhook - ${new Date().toISOString()}`;
    const description = `Issue ID: ${issueId}`;
    return this.createIssue(title, description);
  }

  protected async putProjectIssue(
    gitlabProjectId: string | number,
    issueIid: number,
    body: { title: string; description: string; assignee_ids?: number[] }
  ): Promise<unknown> {
    if (!this.apiToken) {
      this.logger.error('Missing GITLAB_API_TOKEN');
      throw new Error('GitLab configuration is missing');
    }
    const url = `${this.gitlabUrl}/projects/${encodeURIComponent(String(gitlabProjectId))}/issues/${issueIid}`;
    try {
      const payload: Record<string, unknown> = {
        title: body.title,
        description: body.description
      };
      if (body.assignee_ids !== undefined) {
        payload.assignee_ids = body.assignee_ids;
      }
      const response = await firstValueFrom(
        this.httpService.put(url, payload, {
          headers: {
            'PRIVATE-TOKEN': this.apiToken
          }
        })
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      this.logger.error(`Failed to update GitLab issue: ${JSON.stringify(err?.response?.data || err?.message)}`);
      throw error;
    }
  }

  async createIssue(title: string, description: string, labels: string[] = [], assignId?: number): Promise<unknown> {
    const projectId = this.getProjectId();
    if (!this.apiToken || !projectId) {
      this.logger.error('Missing GITLAB_API_TOKEN or project id');
      throw new Error('GitLab configuration is missing');
    }

    const assigneeIds = [25];
    const url = `${this.gitlabUrl}/projects/${projectId}/issues`;
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            title,
            description,
            labels: [...labels].join(','),
            ...(assigneeIds.length > 0 && { assignee_ids: assigneeIds }),
            assignees: assigneeIds.length > 0 ? assigneeIds.map((id) => ({ id })) : undefined
          },
          {
            headers: {
              'PRIVATE-TOKEN': this.apiToken
            }
          }
        )
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create GitLab issue: ${JSON.stringify(error?.response?.data || error?.message)}`);
      throw error;
    }
  }
}

@Injectable()
export class SakuraGitlabService extends BaseGitlabService {
  private readonly sheetLabelMap: Map<string, string>;

  constructor(
    httpService: HttpService,
    private readonly geminiService: GeminiService,
    @InjectRepository(IssueEntity) private readonly issueRepository: Repository<IssueEntity>,
    private readonly teamsWorkflowService: TeamsWorkflowService
  ) {
    super(httpService);
    this.sheetLabelMap = this.buildSheetLabelMap();
  }

  protected getProjectId(): string {
    return env.gitlab.sakuraProjectId;
  }

  /** Map sheet cell (JP / EN label text) → `name_en` via `src/language/labels.json`. */
  mapSheetLabel(rawValue: unknown): string {
    const text = String(rawValue ?? '').trim();
    if (!text) {
      return '';
    }
    return this.sheetLabelMap.get(text) || text;
  }

  /** Slash-separated segments each passed through `mapSheetLabel`. */
  mapSheetMultiLabels(rawValue: unknown): string {
    const text = String(rawValue ?? '').trim();
    if (!text) {
      return '';
    }
    return text
      .split('/')
      .map((part) => this.mapSheetLabel(part.trim()))
      .filter((part) => part.length > 0)
      .join('/');
  }

  private buildSheetLabelMap(): Map<string, string> {
    const map = new Map<string, string>();
    const labelsPath = path.join(process.cwd(), 'src', 'language', 'labels.json');
    try {
      const raw = fs.readFileSync(labelsPath, 'utf8');
      const labels = JSON.parse(raw) as Array<{ name_en?: string; name_jp?: string }>;
      for (const item of labels) {
        const en = String(item.name_en ?? '').trim();
        const jp = String(item.name_jp ?? '').trim();
        if (!en) {
          continue;
        }
        if (jp && !map.has(jp)) {
          map.set(jp, en);
        }
        if (!map.has(en)) {
          map.set(en, en);
        }
      }
    } catch (error) {
      this.logger.warn(`Cannot load labels.json: ${String(error)}`);
    }
    return map;
  }

  /** Same markdown body as create path (Khách / Dịch). */
  buildGitlabIssueDescription(issue: IssueEntity): string {
    const cleanCustomerText = String(issue.originalContent ?? '').replace(/^-{3,}$/gm, '\n').trim();
    const cleanTranslateText = String(issue.translatedContent ?? '').replace(/^-{3,}$/gm, '\n').trim();
    return ['**Khách:**', cleanCustomerText, '', '**Dịch:**', cleanTranslateText].join('\n');
  }

  /**
   * Parses GitLab issue internal id from `web_url` (…/issues/&lt;iid&gt;), or last numeric path segment.
   */
  static extractGitLabIssueIidFromUrl(url: string): number | null {
    const s = String(url ?? '').trim();
    if (!s) {
      return null;
    }
    const fromIssues = s.match(/\/issues\/(\d+)/);
    if (fromIssues) {
      return parseInt(fromIssues[1], 10);
    }
    const pathOnly = s.split(/[?#]/)[0];
    const segments = pathOnly.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^\d+$/.test(last)) {
      return parseInt(last, 10);
    }
    return null;
  }

  /**
   * PUT GitLab issue from DB row: title, full markdown description, assignees.
   * Skips if no token, no project, or `issue.url` does not contain an issue IID.
   */
  async syncStoredIssueToGitLab(issue: IssueEntity, project: ProjectEntity | null): Promise<void> {
    if (!project) {
      return;
    }
    if (!env.gitlab.apiToken?.trim()) {
      return;
    }
    const issueIid = SakuraGitlabService.extractGitLabIssueIidFromUrl(issue.url);
    if (issueIid == null) {
      this.logger.warn(`Skip GitLab sync: cannot parse issue id from url=${issue.url}`);
      return;
    }

    const bigCategory = String(issue.big_category ?? '').trim();
    const smallCategory = String(issue.small_category ?? '').trim();
    const issueTitle =
      String(issue.title ?? '').trim() ||
      `[UAT] No.${String(issue.number ?? '').trim()} ${bigCategory}/${smallCategory}`.trim().slice(0, 255);
    const description = this.buildGitlabIssueDescription(issue);
    const assigneeIds =
      issue.assignedTo?.userId != null && Number.isFinite(issue.assignedTo.userId)
        ? [issue.assignedTo.userId]
        : [];

    await this.putProjectIssue(project.project_id, issueIid, {
      title: issueTitle,
      description,
      assignee_ids: assigneeIds
    });
    this.logger.log(`GitLab issue synced project=${project.project_id} iid=${issueIid}`);
  }

  async buildStoredIssueTitle(
    issue: Pick<IssueEntity, 'number' | 'big_category' | 'small_category' | 'translatedContent'>
  ): Promise<string> {
    const bigCategory = String(issue.big_category ?? '').trim();
    const smallCategory = String(issue.small_category ?? '').trim();
    const issueDescriptionText = String(issue.translatedContent ?? '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
    const ticketNo = String(issue.number ?? '').trim();
    const shortTitle = await this.geminiService.summarizeVietnameseTitle(issueDescriptionText, 10);
    const full = `[UAT] No.${ticketNo} ${bigCategory}/${smallCategory}: ${shortTitle}`.trim();
    return full.length > 255 ? full.slice(0, 255) : full;
  }

  async createIssueGitLab(issueId: number, assignId?: number): Promise<unknown> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignedTo', 'project']
    });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    const status = String(issue.status ?? '').trim();
    const priority = String(issue.priority ?? '').trim();
    const type = String(issue.type ?? '').trim();
    const bigCategory = String(issue.big_category ?? '').trim();
    const smallCategory = String(issue.small_category ?? '').trim();
    const issueTitle =
      String(issue.title ?? '').trim() ||
      `[UAT] No.${String(issue.number ?? '').trim()} ${bigCategory}/${smallCategory}`.trim().slice(0, 255);
    const issueLabels = [status, priority, type, bigCategory, smallCategory]
      .filter((value) => value.length > 0);

    const issueDescription = this.buildGitlabIssueDescription(issue);

    const gitlabResponse = await this.createIssue(issueTitle, issueDescription, issueLabels, assignId);
    const webUrl = String((gitlabResponse as { web_url?: string })?.web_url ?? '');
    const cleanTranslateText = String(issue.translatedContent ?? '').replace(/^-{3,}$/gm, '\n').trim();
    const teamsContent = [cleanTranslateText].filter(Boolean).join('\n\n').slice(0, 8000);
    const assignee = issue.assignedTo;

    if (env.teams.workflowWebhookUrl?.trim()) {
      // await this.teamsNotificationQueue.add(SEND_TEAMS_ISSUE_NOTIFICATION_JOB, { ... }, { attempts: 3, removeOnComplete: true });
      // await this.teamsWorkflowService.sendIssueNotification({
      //   title: issueTitle,
      //   content: teamsContent,
      //   assigneeEmail: assignee ? String(assignee.email ?? '').trim() : '',
      //   assigneeName: assignee ? String(assignee.name ?? '').trim() : '',
      //   ticketUrl: webUrl,
      //   teamUrl: issue.project?.teamUrl ?? '' as string
      // });
    }

    return gitlabResponse;
  }
}
