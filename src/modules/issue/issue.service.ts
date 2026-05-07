import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { env } from '../../configs/env.config';
import { IssueEntity } from '../../entities/issue.entity';
import { UserEntity } from '../../entities/user.entity';
import { GitlabTicketProcessor } from '../webhooks/gitlab-ticket.processor';
import { SakuraGitlabService } from '../webhooks/gitlab.service';
import { IssueFilterDto } from './dto/get-issues-query.dto';
import { IssueListResponseDto } from './dto/issue-list-response.dto';
import { IssueResponseDto } from './dto/issue-response.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { GeminiService } from '../webhooks/gemini.service';
import { TeamsWorkflowService } from '../webhooks/teams-workflow.service';

@Injectable()
export class IssueService {
  private readonly logger = new Logger(IssueService.name);

  constructor(
    @InjectRepository(IssueEntity)
    private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly gitlabTicketProcessor: GitlabTicketProcessor,
    private readonly sakuraGitlabService: SakuraGitlabService,
    private readonly geminiService: GeminiService,
    private readonly teamsWorkflowService: TeamsWorkflowService
  ) {}

  async getAll(query: IssueFilterDto): Promise<IssueListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const queryBuilder = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignedTo', 'assignedTo')
      .leftJoinAndSelect('issue.project', 'project')
      .orderBy('issue.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('LOWER(issue.status) LIKE LOWER(:status)', { status: `%${query.status}%` });
    }

    if (query.project_id != null) {
      queryBuilder.andWhere('project.project_id = :project_id', { project_id: query.project_id });
    }

    if (query.priority) {
      queryBuilder.andWhere('LOWER(TRIM(issue.priority)) = LOWER(TRIM(:priority))', {
        priority: query.priority
      });
    }

    const [rows, total] = await queryBuilder.getManyAndCount();
    const data = rows.map((issue) => this.toIssueResponse(issue));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getOne(id: number): Promise<IssueResponseDto> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'project']
    });

    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`);
    }

    return this.toIssueResponse(issue);
  }

  async updateIssue(id: number, dto: UpdateIssueDto): Promise<IssueResponseDto> {
    if (
      dto.title === undefined &&
      dto.translatedContent === undefined &&
      dto.assignId === undefined
    ) {
      throw new BadRequestException('Provide at least one of title, translatedContent, or assignId');
    }

    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'project']
    });
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`);
    }

    if (dto.title !== undefined) {
      issue.title = dto.title;
    }

    if (dto.translatedContent !== undefined) {
      issue.translatedContent = await this.geminiService.translateText(dto.translatedContent);
    }

    if (dto.assignId !== undefined) {
      const user = await this.userRepository.findOne({ where: { id: dto.assignId } });
      if (!user) {
        throw new NotFoundException(`User ${dto.assignId} not found`);
      }
      issue.assignedTo = user;
    }

    await this.issueRepository.save(issue);

    const forGitlab = await this.issueRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'project']
    });
    if (forGitlab) {
      try {
        await this.sakuraGitlabService.syncStoredIssueToGitLab(forGitlab, forGitlab.project);
      } catch (err: unknown) {
        this.logger.warn(
          `GitLab sync failed after updateIssue: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return this.getOne(id);
  }

  /**
   * Runs GitLab issue creation inline (queue disabled). Label fields are read from DB as translated by the webhook worker.
   * Assignee: existing `issue.assignedTo`, or default user `env.issue.defaultAssigneeUserId` (`users.id`).
   * If `can_send` is false, returns `{ received: false }` without running GitLab.
   * If `can_send` is true but `url` already points to a GitLab issue, syncs that issue (PUT) instead of creating a new one.
   */
  async createGitlabIssueByIssueId(issueId: number): Promise<{ received: boolean }> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignedTo', 'project']
    });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    if (!issue.can_send) {
      return { received: false };
    }

    const linkedUrl = String(issue.url ?? '').trim();
    if (linkedUrl) {
      try {
        await this.sakuraGitlabService.syncStoredIssueToGitLab(issue, issue.project);

        const cleanTranslateText = String(issue.translatedContent ?? '')
          .replace(/^-{3,}$/gm, '\n')
          .trim();
        const teamsContent = [cleanTranslateText].filter(Boolean).join('\n\n').slice(0, 8000);
        const assignee = issue.assignedTo;
        const baseTitle = String(issue.title ?? '').trim();
        const notifTitle =
          (`[Cập nhật issue] No.${issue.number}${baseTitle ? ` — ${baseTitle}` : ''}`).trim().slice(0, 255) ||
          `[Cập nhật issue] No.${issue.number}`;
  
        await this.teamsWorkflowService.sendIssueNotification({
          title: notifTitle,
          content: teamsContent,
          assigneeEmail: assignee ? String(assignee.email ?? '').trim() : '',
          assigneeName: assignee ? String(assignee.name ?? '').trim() : '',
          ticketUrl: String(issue.url ?? '').trim(),
          teamUrl: String(issue.project?.teamUrl ?? '').trim()
        });
      } catch (err: unknown) {
        this.logger.warn(
          `GitLab sync failed (existing url): ${err instanceof Error ? err.message : String(err)}`
        );
        return { received: false };
      }
      issue.can_send = false;
      await this.issueRepository.save(issue);
      return { received: true };
    }

    if (!issue.assignedTo) {
      throw new NotFoundException(`Issue ${issueId} has no assignee; set assignee before creating GitLab issue`);
    }

    await this.issueRepository.save(issue);

    // await this.gitlabTicketQueue.add(
    //   CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB,
    //   { issueId, gitlabAssignId: issue.assignedTo.userId },
    //   { attempts: 3, removeOnComplete: true }
    // );
    await this.gitlabTicketProcessor.runCreateGitlabIssueFromIssuePayload({
      issueId,
      gitlabAssignId: issue.assignedTo.userId
    });

    return { received: true };
  }

  private toIssueResponse(issue: IssueEntity): IssueResponseDto {
    return {
      id: issue.id,
      project_id: issue.project?.project_id ?? null,
      spreadsheetId: issue.spreadsheetId,
      sheetName: issue.sheetName,
      title: issue.title,
      is_resolved: issue.is_resolved,
      number: issue.number,
      row: issue.row ?? null,
      col: issue.col ?? null,
      status: issue.status,
      priority: issue.priority,
      type: issue.type,
      big_category: issue.big_category,
      small_category: issue.small_category,
      originalContent: issue.originalContent,
      translatedContent: issue.translatedContent,
      url: issue.url,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      assignedTo: issue.assignedTo,
      can_send: Boolean(issue.can_send ?? false)
    };
  }
}
