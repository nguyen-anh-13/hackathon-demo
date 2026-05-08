import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateProjectFromUrlDto } from './dto/create-project-from-url.dto';
import { GitlabProjectDetailResponseDto } from './dto/gitlab-project-detail-response.dto';
import { ProjectListQueryDto } from './dto/get-projects-query.dto';
import { ProjectListResponseDto } from './dto/project-list-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectAssignedDto } from './dto/update-project-assigned.dto';
import { ProjectService } from './project.service';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Project detail',
    description: 'Get project detail by id.'
  })
  @ApiOkResponse({ type: GitlabProjectDetailResponseDto })
  getProjectDetail(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getGitlabProjectDetail(String(id));
  }

  @Get('detail/:id')
  @ApiOperation({
    summary: 'Project detail',
    description: 'Get project detail by id.'
  })
  @ApiOkResponse({ type: GitlabProjectDetailResponseDto })
  getProjectById(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectById(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create project from Google Sheets URL',
    description:
      'Fetches spreadsheet metadata (title, sheet tabs) from the given URL and creates a project with all sheets populated. Optionally set a sync destination URL.',
  })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  createFromUrl(@Body() body: CreateProjectFromUrlDto) {
    return this.projectService.createFromUrl(body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update project assignee only',
    description: 'Body must include `assignedTo`: a `users.id`, or `null` to clear. Other project fields cannot be changed here.'
  })
  @ApiOkResponse({ type: ProjectResponseDto })
  updateAssignedTo(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProjectAssignedDto) {
    return this.projectService.updateAssignedTo(id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  @ApiOkResponse({ type: ProjectListResponseDto })
  getAll(@Query() query: ProjectListQueryDto) {
    return this.projectService.getAll(query);
  }
}
