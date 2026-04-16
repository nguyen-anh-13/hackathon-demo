import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { env } from '../../configs/env.config';

/** Subset of GitLab REST `GET /projects/:id` response used by this app */
export type GitLabProjectApiDto = {
  id?: number;
  name?: string;
  path_with_namespace?: string;
  description?: string;
  web_url?: string;
};

@Injectable()
export class GitlabApiClient {
  private readonly logger = new Logger(GitlabApiClient.name);
  private readonly gitlabUrl = env.gitlab.apiUrl.replace(/\/$/, '');
  private readonly apiToken = env.gitlab.apiToken;

  constructor(private readonly httpService: HttpService) {}

  async getProject(projectId: string): Promise<GitLabProjectApiDto> {
    const id = String(projectId ?? '').trim();
    if (!id) {
      throw new Error('GitLab project id is required');
    }
    if (!this.apiToken) {
      this.logger.error('Missing GITLAB_API_TOKEN');
      throw new Error('GitLab API token is not configured');
    }

    const url = `${this.gitlabUrl}/projects/${encodeURIComponent(id)}`;
    const { data } = await firstValueFrom(
      this.httpService.get<GitLabProjectApiDto>(url, {
        headers: { 'PRIVATE-TOKEN': this.apiToken }
      })
    );
    return data;
  }

  async getProjectName(projectId: string): Promise<string> {
    const data = await this.getProject(projectId);
    return String(data.name ?? '');
  }
}
