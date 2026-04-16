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
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssueService {
  private readonly logger = new Logger(IssueService.name);

  constructor(
    @InjectRepository(IssueEntity)
    private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly gitlabTicketProcessor: GitlabTicketProcessor,
    private readonly sakuraGitlabService: SakuraGitlabService
  ) {}

  async getAll(query: IssueFilterDto): Promise<IssueListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const queryBuilder = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignedTo', 'assignedTo')
      .orderBy('issue.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('LOWER(issue.status) LIKE LOWER(:status)', { status: `%${query.status}%` });
    }

    if (query.project_id != null) {
      queryBuilder
        .innerJoin('issue.project', 'project')
        .andWhere('project.project_id = :project_id', { project_id: query.project_id });
    }

    if (query.priority) {
      queryBuilder.andWhere('LOWER(TRIM(issue.priority)) = LOWER(TRIM(:priority))', {
        priority: query.priority
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getOne(id: number): Promise<IssueEntity> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: ['assignedTo']
    });

    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`);
    }

    return issue;
  }

  async updateIssue(id: number, dto: UpdateIssueDto): Promise<IssueEntity> {
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
      issue.translatedContent = dto.translatedContent;
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
   */
  async createGitlabIssueByIssueId(issueId: number): Promise<{ received: boolean }> {
    const issue = await this.issueRepository.findOne({ where: { id: issueId }, relations: ['assignedTo'] });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    if (!issue.can_send) {
      return { received: false };
    }

    if (!issue.assignedTo) {
      const defaultUser = await this.userRepository.findOne({
        where: { id: env.issue.defaultAssigneeUserId }
      });
      if (!defaultUser) {
        throw new NotFoundException(
          `Default assignee user id ${env.issue.defaultAssigneeUserId} not found in users`
        );
      }
      issue.assignedTo = defaultUser;
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
}
