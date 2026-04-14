import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../../configs/env.config';
import { GeminiService } from './gemini.service';

@Injectable()
export abstract class GitlabIssueService {
  abstract createIssue(title: string, description: string, labels?: string[]): Promise<unknown>;
  abstract createIssueFromWebhook(payload: unknown): Promise<unknown>;
}

abstract class BaseGitlabService extends GitlabIssueService {
  protected readonly logger = new Logger(BaseGitlabService.name);
  private readonly gitlabUrl = env.gitlab.apiUrl;
  private readonly apiToken = env.gitlab.apiToken;

  constructor(private readonly httpService: HttpService) {
    super();
  }

  protected abstract getProjectId(): string;

  async createIssueFromWebhook(payload: unknown): Promise<unknown> {
    const title = `Google Sheets webhook - ${new Date().toISOString()}`;
    const description = `Payload:\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
    return this.createIssue(title, description);
  }

  async createIssue(title: string, description: string, labels: string[] = []): Promise<unknown> {
    const projectId = this.getProjectId();
    if (!this.apiToken || !projectId) {
      this.logger.error('Missing GITLAB_API_TOKEN or project id');
      throw new Error('GitLab configuration is missing');
    }

    const url = `${this.gitlabUrl}/projects/${projectId}/issues`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            title,
            description,
            labels: ['webhook', 'google-sheets', ...labels].join(',')
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

  constructor(httpService: HttpService, private readonly geminiService: GeminiService) {
    super(httpService);
  }

  protected getProjectId(): string {
    return env.gitlab.sakuraProjectId;
  }

  async createIssueFromWebhook(payload: unknown): Promise<unknown> {
    const row = this.extractRow(payload);
    if (!row.length) {
      const fallbackTitle = `[Sakura] Google Sheets update - ${new Date().toISOString()}`;
      const fallbackDescription = [
        'Khong tim thay allRowData hop le trong payload.',
        '',
        '```json',
        JSON.stringify(payload, null, 2),
        '```'
      ].join('\n');
      return this.createIssue(fallbackTitle, fallbackDescription);
    }

    const status = this.mapLabel(row[3]);
    const priority = this.mapLabel(row[4]);
    const type = this.mapLabel(row[5]);
    const bigCategory = this.mapLabel(row[9]);
    const smallCategory = this.mapLabel(row[10]);
    const customerText = String(row[12] ?? '').trim();
    const issueDescriptionText = customerText ? await this.geminiService.translateText(customerText) : '';
    const ticketNo = String(row[2] ?? '').trim();
    const shortTitle = await this.geminiService.summarizeVietnameseTitle(issueDescriptionText, 10);
    const issueTitle = `[UAT] No.${ticketNo} ${bigCategory}/${smallCategory}: ${shortTitle}`.trim();
    const issueLabels = [status, priority, type, bigCategory, smallCategory]
      .filter((value) => value.length > 0);

    const issueBody = [
      `Khách: ${customerText}`,
      `Dịch: ${issueDescriptionText}`
    ].join('\n');

    return this.createIssue(issueTitle, issueBody, issueLabels);
  }

  private extractRow(payload: unknown): unknown[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const allRowData = (payload as { allRowData?: unknown }).allRowData;
    if (Array.isArray(allRowData)) {
      if (Array.isArray(allRowData[0])) {
        return allRowData[0] as unknown[];
      }
      return allRowData as unknown[];
    }

    return [];
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
}
