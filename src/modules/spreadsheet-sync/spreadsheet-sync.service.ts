import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleSheetsClient } from '../../clients/google-sheets/google-sheets.client';
import { ProjectEntity } from '../../entities/project.entity';

/**
 * Payload shape mirrors CreateGitlabTicketPayload['payload'] from gitlab-ticket.processor.
 * Defined here separately to avoid a circular dependency.
 */
export interface SyncRowPayload {
  spreadsheetId?: string;
  sheetName?: string;
  changedCell?: {
    row?: number;
    col?: number;
    value?: string;
  };
  allRowData?: unknown[];
}

/**
 * Column index (0-based) in `allRowData` that holds the original content text.
 * The translated version of this column is written to the sync spreadsheet at the same index.
 */
const TRANSLATED_CONTENT_COL_INDEX = 12;

@Injectable()
export class SpreadsheetSyncService {
  private readonly logger = new Logger(SpreadsheetSyncService.name);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly googleSheetsClient: GoogleSheetsClient,
  ) {}

  /**
   * After a webhook row is processed and translated, writes the full row
   * (with `translatedContent` substituted at index 12) to the project's
   * sync spreadsheet at the same sheetName + rowIndex.
   *
   * Silently skips if:
   *  - spreadsheetId or sheetName is missing
   *  - no project found for spreadsheetId
   *  - project has no syncSpreadsheetId configured
   */
  async syncRow(payload: SyncRowPayload, translatedContent: string): Promise<void> {
    const spreadsheetId = String(payload?.spreadsheetId ?? '').trim();
    const sheetName = String(payload?.sheetName ?? '').trim();
    const rowIndex = Number(payload?.changedCell?.row ?? 0);

    if (!spreadsheetId || !sheetName || !rowIndex) {
      return;
    }

    const project = await this.projectRepository.findOne({
      where: { spreadsheetId },
    });

    if (!project?.syncSpreadsheetId) {
      return;
    }

    const allRowData = Array.isArray(payload.allRowData) ? [...payload.allRowData] : [];

    // Pad the array if it's shorter than the translated column index
    while (allRowData.length <= TRANSLATED_CONTENT_COL_INDEX) {
      allRowData.push('');
    }
    allRowData[TRANSLATED_CONTENT_COL_INDEX] = translatedContent;

    try {
      await this.googleSheetsClient.writeRowValues(
        project.syncSpreadsheetId,
        sheetName,
        rowIndex,
        allRowData,
      );
      this.logger.log(
        `Synced row ${rowIndex} of sheet "${sheetName}" → syncSpreadsheetId=${project.syncSpreadsheetId}`,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `Spreadsheet sync failed for row ${rowIndex} / sheet "${sheetName}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
