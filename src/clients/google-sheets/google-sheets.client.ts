import { Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { env } from '../../configs/env.config';

export interface SheetInfo {
  sheetId: number;
  sheetName: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: SheetInfo[];
}

@Injectable()
export class GoogleSheetsClient {
  private readonly logger = new Logger(GoogleSheetsClient.name);
  private sheets: sheets_v4.Sheets;
  private googleAuth: InstanceType<typeof google.auth.GoogleAuth>;

  constructor() {
    this.googleAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.google.serviceAccountEmail,
        private_key: env.google.serviceAccountPrivateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.googleAuth });
  }

  /** Lấy title và danh sách sheets (tên + internal sheetId) của một spreadsheet. */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId,properties/title,sheets(properties(sheetId,title))',
    });

    const data = response.data;
    const sheets: SheetInfo[] = (data.sheets ?? []).map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      sheetName: s.properties?.title ?? '',
    }));

    return {
      spreadsheetId: data.spreadsheetId ?? spreadsheetId,
      title: data.properties?.title ?? '',
      sheets,
    };
  }

  /**
   * Ghi toàn bộ 1 hàng vào sheet tại rowIndex (1-based, tính từ header = row 1).
   * Range: 'SheetName'!A{rowIndex}
   */
  async writeRowValues(
    spreadsheetId: string,
    sheetName: string,
    rowIndex: number,
    values: unknown[],
  ): Promise<void> {
    const safeSheetName = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
    const range = `${safeSheetName}!A${rowIndex}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values.map((v) => (v == null ? '' : String(v)))],
      },
    });

    this.logger.log(`Wrote row ${rowIndex} to ${sheetName} in spreadsheet ${spreadsheetId}`);
  }

  /**
   * Đọc toàn bộ dữ liệu của một sheet.
   * Returns mảng 2D (mỗi phần tử là 1 hàng, mỗi hàng là mảng string).
   */
  async getSheetValues(spreadsheetId: string, sheetName: string): Promise<string[][]> {
    const safeSheetName = sheetName.includes(' ') ? `'${sheetName}'` : sheetName;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: safeSheetName,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    return (response.data.values ?? []) as string[][];
  }
}
