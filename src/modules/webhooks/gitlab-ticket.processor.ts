import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import {
  GITLAB_TICKET_QUEUE,
  PUSH_ISSUE_TO_GITLAB_JOB,
  UPSERT_ISSUE_FROM_SHEET_JOB
} from './webhooks.constants';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import { GeminiService } from './gemini.service';
import { SakuraGitlabService } from './gitlab.service';
import { SpreadsheetSyncService } from '../spreadsheet-sync/spreadsheet-sync.service';
import { GoogleSheetsClient } from '../../clients/google-sheets/google-sheets.client';

/**
 * Returns true if a cell value from allRowData indicates an in-cell image.
 * Google Sheets API returns "IMAGE" (or "image") as the formatted value for in-cell images.
 * Some webhook senders encode it as an object { valueType: "image" }.
 */
function isImageCellValue(val: unknown): boolean {
  if (typeof val === 'string') {
    return val.toUpperCase() === 'IMAGE';
  }
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    return String(obj['valueType'] ?? '').toUpperCase() === 'IMAGE';
  }
  return false;
}

export type CreateGitlabTicketPayload = {
  payload: {
    spreadsheetId?: string;
    sheetName?: string;
    changedCell?: {
      row?: number;
      col?: number;
      value?: string;
    };
    allRowData?: unknown[];
    timestamp?: string;
  };
};

export type CreateGitlabIssueFromIssuePayload = {
  issueId: number;
  gitlabAssignId?: number;
};

@Processor(GITLAB_TICKET_QUEUE)
export class GitlabTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(GitlabTicketProcessor.name);

  constructor(
    @InjectRepository(IssueEntity) private readonly issueRepository: Repository<IssueEntity>,
    @InjectRepository(ProjectEntity) private readonly projectRepository: Repository<ProjectEntity>,
    private readonly geminiService: GeminiService,
    private readonly sakuraGitlabService: SakuraGitlabService,
    private readonly spreadsheetSyncService: SpreadsheetSyncService,
    private readonly googleSheetsClient: GoogleSheetsClient,
  ) {
    super();
  }

  async process(job: Job<CreateGitlabTicketPayload | CreateGitlabIssueFromIssuePayload>): Promise<void> {
    if (job.name === UPSERT_ISSUE_FROM_SHEET_JOB) {
      await this.createIssueRecord((job.data as CreateGitlabTicketPayload).payload);
      this.logger.log(`Issue upserted from sheet for job ${job.id}`);
      return;
    }

    if (job.name === PUSH_ISSUE_TO_GITLAB_JOB) {
      await this.createGitlabIssueFromIssue(job.data as CreateGitlabIssueFromIssuePayload);
      this.logger.log(`Issue pushed to GitLab for job ${job.id}`);
      return;
    }

    this.logger.warn(`Unknown job name: ${job.name}`);
  }

  /** Gọi trực tiếp thay cho enqueue `CREATE_GITLAB_TICKET_JOB` */
  async runCreateGitlabTicketFromWebhookPayload(payload: CreateGitlabTicketPayload['payload']): Promise<void> {
    await this.createIssueRecord(payload);
  }

  /** Gọi trực tiếp thay cho enqueue `CREATE_GITLAB_ISSUE_FROM_ISSUE_JOB` */
  async runCreateGitlabIssueFromIssuePayload(data: CreateGitlabIssueFromIssuePayload): Promise<void> {
    await this.createGitlabIssueFromIssue(data);
  }

  private async createIssueRecord(payload: CreateGitlabTicketPayload['payload']): Promise<void> {
    const row = Array.isArray(payload?.allRowData) ? payload.allRowData : [];
    const spreadsheetId = String(payload?.spreadsheetId ?? '');
    const sheetName = String(payload?.sheetName ?? '');
    const issueNumber = Number(row[2] ?? 0);
    const cellRow = Number(payload?.changedCell?.row);
    const cellCol = Number(payload?.changedCell?.col);
    const newOriginalContent = String(row[12] ?? '');
    const status = this.sakuraGitlabService.mapSheetLabel(row[3]);
    const priority = this.sakuraGitlabService.mapSheetLabel(row[4]);
    const type = this.sakuraGitlabService.mapSheetLabel(row[5]);
    const big_category = this.sakuraGitlabService.mapSheetLabel(row[9]);
    const small_category = this.sakuraGitlabService.mapSheetMultiLabels(row[10]);

    // Query existing issue first so we can do delta translation on update
    const existingIssue = await this.issueRepository.findOne({
      where: { spreadsheetId, number: issueNumber },
      relations: ['project', 'assignedTo']
    });

    const translatedContent = await this.resolveTranslatedContent(
      newOriginalContent,
      existingIssue?.originalContent ?? null,
      existingIssue?.translatedContent ?? null,
    );

    const contentUnchanged = translatedContent === null;

    const project = await this.resolveProjectBySpreadsheetId(spreadsheetId);
    const projectAssignee = project?.assignedTo ?? null;

    const effectiveTranslatedContent = translatedContent ?? existingIssue?.translatedContent ?? '';
    const title = await this.sakuraGitlabService.buildStoredIssueTitle({
      number: issueNumber,
      big_category,
      small_category,
      translatedContent: effectiveTranslatedContent
    });

    if (existingIssue) {
      existingIssue.is_resolved = Boolean(row[0] ?? false);
      existingIssue.status = status;
      existingIssue.priority = priority;
      existingIssue.type = type;
      existingIssue.big_category = big_category;
      existingIssue.small_category = small_category;
      if (!contentUnchanged) {
        existingIssue.originalContent = newOriginalContent;
        existingIssue.translatedContent = effectiveTranslatedContent;
      }
      existingIssue.title = title;
      existingIssue.project = project ?? null;
      if (projectAssignee) {
        existingIssue.assignedTo = projectAssignee;
      }
      existingIssue.can_send = true;
      await this.issueRepository.save(existingIssue);

      await this.spreadsheetSyncService.syncRow(payload, effectiveTranslatedContent);

      try {
        await this.sakuraGitlabService.syncStoredIssueToGitLab(existingIssue, project);
      } catch (err: unknown) {
        this.logger.warn(
          `GitLab sync failed after webhook update: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      return;
    }

    const issue = this.issueRepository.create({
      spreadsheetId,
      sheetName,
      title,
      project: project ?? undefined,
      ...(projectAssignee ? { assignedTo: projectAssignee } : {}),
      is_resolved: Boolean(row[0] ?? false),
      number: issueNumber,
      ...(cellRow != null ? { row: cellRow } : {}),
      ...(cellCol != null ? { col: cellCol } : {}),
      status,
      priority,
      type,
      big_category,
      small_category,
      originalContent: newOriginalContent,
      translatedContent: effectiveTranslatedContent,
      created_at: row[7] ? new Date(String(row[7])) : new Date()
    });

    await this.issueRepository.save(issue);
    this.logger.log(`Issue record saved for spreadsheet_id=${spreadsheetId}, sheet_name=${sheetName}, issue_number=${issueNumber}`);

    await this.spreadsheetSyncService.syncRow(payload, effectiveTranslatedContent);
  }

  /**
   * Delta translation logic:
   * - Nội dung mới GIỐNG HỆT cũ → trả về null (bỏ qua update).
   * - Nội dung mới DÀI HƠN cũ → chỉ dịch phần bổ sung (delta), nối vào translatedContent hiện có.
   * - Các trường hợp còn lại (ngắn hơn / thay đổi nội dung / issue mới) → dịch toàn bộ.
   *
   * @returns string   – bản dịch đã tính
   * @returns null     – nội dung không thay đổi, không cần dịch hay update
   */
  private async resolveTranslatedContent(
    newContent: string,
    existingOriginal: string | null,
    existingTranslated: string | null,
  ): Promise<string | null> {
    if (existingOriginal !== null) {
      if (newContent === existingOriginal) {
        return null;
      }

      if (existingTranslated !== null && newContent.length > existingOriginal.length) {
        const delta = newContent.slice(existingOriginal.length).trim();
        if (delta) {
          const translatedDelta = await this.geminiService.translateText(delta);
          return existingTranslated
            ? `${existingTranslated}\n${translatedDelta}`
            : translatedDelta;
        }
        return existingTranslated;
      }
    }
    return this.geminiService.translateText(newContent);
  }

  private async resolveProjectBySpreadsheetId(spreadsheetId: string): Promise<ProjectEntity | null> {
    const trimmed = spreadsheetId.trim();
    if (!trimmed) {
      return null;
    }
    const found = await this.projectRepository.findOne({
      where: { spreadsheetId: trimmed },
      relations: ['assignedTo']
    });
    if (!found) {
      this.logger.warn(`No project row for spreadsheet_id=${trimmed}; issue will have no project link`);
    }
    return found;
  }

  private async createGitlabIssueFromIssue(payload: CreateGitlabIssueFromIssuePayload): Promise<void> {
    const issueId = Number(payload?.issueId ?? 0);
    if (!issueId) {
      throw new NotFoundException('Issue id is required');
    }

    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }

    const gitlabUserId = payload.gitlabAssignId;

    const gitlabResponse = await this.sakuraGitlabService.createIssueGitLab(issueId, gitlabUserId);
    issue.url = String((gitlabResponse as { web_url?: string })?.web_url ?? '');
    issue.can_send = false;
    await this.issueRepository.save(issue);
  }
}
