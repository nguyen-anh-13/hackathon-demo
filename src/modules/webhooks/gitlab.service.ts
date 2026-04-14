import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { env } from '../../configs/env.config';
import { GeminiService } from './gemini.service';
import { IssueEntity } from '../../entities/issue.entity';

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
  private readonly labelMap = this.buildLabelMap();

  constructor(
    httpService: HttpService,
    private readonly geminiService: GeminiService,
    @InjectRepository(IssueEntity) private readonly issueRepository: Repository<IssueEntity>
  ) {
    super(httpService);
  }

  protected getProjectId(): string {
    return env.gitlab.sakuraProjectId;
  }

  async buildStoredIssueTitle(
    issue: Pick<IssueEntity, 'number' | 'big_category' | 'small_category' | 'translatedContent'>
  ): Promise<string> {
    const bigCategory = this.mapLabel(issue.big_category);
    const smallCategory = this.mapMultiLabels(issue.small_category);
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
      where: { id: issueId }
    });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    const status = this.mapLabel(issue.status);
    const priority = this.mapLabel(issue.priority);
    const type = this.mapLabel(issue.type);
    const bigCategory = this.mapLabel(issue.big_category);
    const smallCategory = this.mapMultiLabels(issue.small_category);
    const customerText = String(issue.originalContent ?? '').replace(/[\r\n]+/g, ' ').trim();
    const issueDescriptionText = String(issue.translatedContent).replace(/[\r\n]+/g, ' ').trim();
    const ticketNo = String(issue.number ?? '').trim();
    const issueTitle = String(issue.title ?? '').trim();
    const issueLabels = [status, priority, type, bigCategory, smallCategory]
      .filter((value) => value.length > 0);

    const cleanCustomerText = String(issue.originalContent ?? '').trim();
    const cleanTranslateText = String(issue.translatedContent ?? '').trim();
    
    const issueDescription = `
    **Khách:** <pre>${cleanCustomerText}</pre>
    
    **Dịch:** ${cleanTranslateText}
    
    `.trim();

    return this.createIssue(issueTitle, issueDescription, issueLabels, assignId);
  }

  private buildLabelMap(): Map<string, string> {
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
      this.logger.warn(`Cannot load labels mapping: ${String(error)}`);
    }

    return map;
  }

  private mapLabel(rawValue: unknown): string {
    const text = String(rawValue ?? '').trim();
    if (!text) {
      return '';
    }
    return this.labelMap.get(text) || text;
  }

  private mapMultiLabels(rawValue: unknown): string {
    const text = String(rawValue ?? '').trim();
    if (!text) {
      return '';
    }

    return text
      .split('/')
      .map((part) => this.mapLabel(part))
      .filter((part) => part.length > 0)
      .join('/');
  }
}
