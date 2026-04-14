import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IssueResponseDto } from './dto/issue-response.dto';
import { CreateGitlabIssueDto } from './dto/create-gitlab-issue.dto';
import { IssueService } from './issue.service';
import { CurrentUser } from '../../decorators';
import { GetIssuesQueryDto } from './dto/get-issues-query.dto';
import { IssueListResponseDto } from './dto/issue-list-response.dto';

@ApiTags('issues')
@Controller('issues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all issues' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isResolved', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiOkResponse({ type: IssueListResponseDto })
  getAll(@Query() query: GetIssuesQueryDto) {
    return this.issueService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one issue by id' })
  @ApiOkResponse({ type: IssueResponseDto })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getOne(id);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Create GitLab issue from stored issue' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true }
      }
    }
  })
  createIssueFromStoredRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateGitlabIssueDto,
    @CurrentUser('id') userId: number
  ): Promise<any> {
    return this.issueService.createGitlabIssueByIssueId(id, userId, body.assignId);
  }
}
