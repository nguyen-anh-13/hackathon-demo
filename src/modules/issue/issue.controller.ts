import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IssueResponseDto } from './dto/issue-response.dto';
import { IssueService } from './issue.service';
import { IssueFilterDto } from './dto/get-issues-query.dto';
import { IssueListResponseDto } from './dto/issue-list-response.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@ApiTags('issues')
@Controller('issues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all issues' })
  @ApiOkResponse({ type: IssueListResponseDto })
  getAll(@Query() query: IssueFilterDto) {
    return this.issueService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one issue by id' })
  @ApiOkResponse({ type: IssueResponseDto })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.issueService.getOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update issue',
    description: 'At least one of: title, translatedContent, assignId (`users.id`).'
  })
  @ApiOkResponse({ type: IssueResponseDto })
  updateIssue(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateIssueDto) {
    return this.issueService.updateIssue(id, body);
  }

  @Post(':id')
  @ApiOperation({
    summary: 'Create GitLab issue from stored issue',
    description:
      'No body. Uses issue assignee if set; otherwise assigns user `DEFAULT_ISSUE_ASSIGNEE_USER_ID` (`users.id`, default 25).'
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true }
      }
    }
  })
  createIssueFromStoredRecord(@Param('id', ParseIntPipe) id: number): Promise<{ received: boolean }> {
    return this.issueService.createGitlabIssueByIssueId(id);
  }
}
