import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GitlabApiClient } from '../../clients/gitlab/gitlab-api.client';
import { ProjectEntity } from '../../entities/project.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { GitlabProjectDetailResponseDto } from './dto/gitlab-project-detail-response.dto';
import { ProjectListQueryDto } from './dto/get-projects-query.dto';
import { ProjectListResponseDto } from './dto/project-list-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectAssignedDto } from './dto/update-project-assigned.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly gitlabApiClient: GitlabApiClient
  ) {}

  async getAll(query: ProjectListQueryDto): Promise<ProjectListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.assignedTo', 'assignedTo')
      .orderBy('project.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const data = rows.map((p) => this.toProjectResponse(p));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async create(dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const existing = await this.projectRepository.findOne({ where: { project_id: dto.project_id } });
    if (existing) {
      throw new ConflictException(`Project with project_id ${dto.project_id} already exists`);
    }

    const spreadsheetId = this.spreadsheetIdFromExcelUrl(dto.excelUrl);

    const entity = this.projectRepository.create({
      project_id: dto.project_id,
      name: dto.name,
      spreadsheetId,
      teamUrl: dto.teamUrl ?? null
    });

    if (dto.assignedTo != null) {
      const user = await this.userRepository.findOne({ where: { id: dto.assignedTo } });
      if (!user) {
        throw new NotFoundException(`User ${dto.assignedTo} not found`);
      }
      entity.assignedTo = user;
    }

    const saved = await this.projectRepository.save(entity);
    return this.toProjectResponse(saved);
  }

  async updateAssignedTo(id: number, dto: UpdateProjectAssignedDto): Promise<ProjectResponseDto> {
    if (dto.assignedTo === undefined) {
      throw new BadRequestException('assignedTo is required (a positive integer, or null to clear)');
    }

    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    if (dto.assignedTo === null) {
      project.assignedTo = null;
    } else {
      const user = await this.userRepository.findOne({ where: { id: dto.assignedTo } });
      if (!user) {
        throw new NotFoundException(`User ${dto.assignedTo} not found`);
      }
      project.assignedTo = user;
    }

    const saved = await this.projectRepository.save(project);
    return this.toProjectResponse(saved);
  }

  /** Expects a Google Sheets URL; id is the path segment after `/d/` and before the next `/`. */
  private spreadsheetIdFromExcelUrl(excelUrl: string): string {
    const trimmed = excelUrl.trim();
    const match = trimmed.match(/\/d\/([^/]+)/);
    const id = match?.[1];
    if (!id) {
      throw new BadRequestException(
        'excelUrl must be a Google Sheets link (segment after /d/ and before the next / is the spreadsheet id)'
      );
    }
    return id;
  }

  private toProjectResponse(project: ProjectEntity): ProjectResponseDto {
    const assignedToId = project.assignedTo?.id ?? null;

    return {
      id: project.id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      project_id: project.project_id,
      name: project.name,
      spreadsheetId: project.spreadsheetId,
      assignedToId,
      teamUrl: project.teamUrl
    };
  }

  async getGitlabProjectDetail(gitlabProjectId: string): Promise<GitlabProjectDetailResponseDto> {
    const data = await this.gitlabApiClient.getProject(gitlabProjectId);
    return {
      id: data.id,
      name: data.name,
      path_with_namespace: data.path_with_namespace,
      description: data.description,
      web_url: data.web_url
    };
  }
}
