import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { IssueEntity } from '../../entities/issue.entity';
import { UserEntity } from '../../entities/user.entity';
import { CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB, GITLAB_TICKET_QUEUE } from '../webhooks/webhooks.constants';
import { GetIssuesQueryDto } from './dto/get-issues-query.dto';
import { IssueListResponseDto } from './dto/issue-list-response.dto';

@Injectable()
export class IssueService {
  constructor(
    @InjectRepository(IssueEntity)
    private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(GITLAB_TICKET_QUEUE)
    private readonly gitlabTicketQueue: Queue
  ) {}

  async getAll(query: GetIssuesQueryDto): Promise<IssueListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const queryBuilder = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignedTo', 'assignedTo')
      .orderBy('issue.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      queryBuilder.andWhere('LOWER(issue.status) LIKE LOWER(:status)', { status: `%${query.status}%` });
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

  async createGitlabIssueByIssueId(
    issueId: number,
    callerUserId: number,
    assignId?: number
  ): Promise<{ received: boolean }> {
    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }
    
    const resolvedAssignId = assignId || callerUserId || 25;
    const user = await this.userRepository.findOne({ where: { id: resolvedAssignId } });
    if (user) {
      issue.assignedTo = user;
    }
    await this.issueRepository.save(issue);

    await this.gitlabTicketQueue.add(
      CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB,
      {
        issueId,
        gitlabAssignId: user?.userId
      },
      {
        attempts: 3,
        removeOnComplete: true
      }
    );

    return { received: true };
  }
}
