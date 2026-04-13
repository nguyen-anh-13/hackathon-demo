import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { env } from '../../configs/env.config';
import { GeminiService } from './gemini.service';

@Injectable()
export abstract class GitlabIssueService {
  abstract createIssue(title: string, description: string): Promise<unknown>;
  abstract createIssueFromWebhook(payload: unknown): Promise<unknown>;
}

abstract class BaseGitlabService extends GitlabIssueService {
  private readonly logger = new Logger(BaseGitlabService.name);
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

  async createIssue(title: string, description: string): Promise<unknown> {
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
            labels: 'webhook,google-sheets'
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

    const targetIndexes = [3, 4, 5, 9, 10, 12];
    const rawTexts = targetIndexes.map((index) => row[index]);
    const textsToTranslate = rawTexts.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );
    const translatedValues = await this.geminiService.translateBatch(textsToTranslate);

    let translatedCursor = 0;
    const translatedByIndex = rawTexts.map((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        const translated = translatedValues[translatedCursor] || value;
        translatedCursor += 1;
        return translated;
      }
      return '';
    });

    const [status = '', priority = '', type = '', bigCategory = '', smallCategory = '', issueDescriptionText = ''] =
      translatedByIndex;
    const ticketNo = String(row[2] ?? '').trim();
    const customerText = String(row[12] ?? '').trim();
    const shortTitle = await this.geminiService.summarizeVietnameseTitle(issueDescriptionText, 10);
    const issueTitle = `[UAT] No.${ticketNo} ${bigCategory}/${smallCategory}: ${shortTitle}`.trim();

    const issueBody = [
      `Khach: ${customerText}`,
      `Dich: ${issueDescriptionText}`
    ].join('\n');

    const createIssueData = this.createIssue(issueTitle, issueBody);

    // connect to teams
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
}
