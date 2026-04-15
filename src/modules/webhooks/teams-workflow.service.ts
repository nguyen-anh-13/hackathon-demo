import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { env } from '../../configs/env.config';

export type TeamsIssueNotificationPayload = {
  title: string;
  content: string;
  assigneeEmail: string;
  assigneeName: string;
  ticketUrl: string;
};

@Injectable()
export class TeamsWorkflowService {
  private readonly logger = new Logger(TeamsWorkflowService.name);

  constructor(private readonly httpService: HttpService) {}

  buildAdaptiveCardMessage(payload: TeamsIssueNotificationPayload): Record<string, unknown> {
    const { title, content, assigneeEmail, assigneeName, ticketUrl } = payload;
    const safeName = assigneeName.trim() || 'N/A';
    const hasMention = Boolean(assigneeEmail.trim() && safeName && safeName !== 'N/A');
  
    const body: Record<string, unknown>[] = [
      {
        type: 'TextBlock',
        text: title,
        weight: 'Bolder',
        size: 'Large', // Tăng size để làm tiêu đề bài post
        wrap: true,
        // Bỏ color: 'Accent' để trông giống text người dùng tự gõ hơn
      },
      {
        type: 'TextBlock',
        text: hasMention ? `<at>${safeName}</at>` : safeName,
        weight: 'Bolder',
        color: 'Attention', // Màu cam/đỏ giống hệt ảnh bạn gửi
        size: 'Medium',
        spacing: 'Small'
      },
      {
        type: 'TextBlock',
        text: content || '—',
        wrap: true,
        spacing: 'Medium' // Tạo khoảng cách với phần tên phía trên
      }
    ];
  
    // Nếu bạn muốn bỏ hẳn nút bấm để nó giống bài post 100%
    // Bạn có thể chèn link ẩn vào text hoặc giữ Action nhưng đổi kiểu hiển thị
    const actions = ticketUrl ? [
      {
        type: 'Action.OpenUrl',
        title: '🔗 Xem chi tiết Ticket', // Thêm emoji cho thân thiện
        url: ticketUrl
      }
    ] : [];
  
    const card: Record<string, unknown> = {
      type: 'AdaptiveCard',
      version: '1.2',
      body,
      actions,
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      // Mẹo: Padding dày hơn một chút giúp card trông thoáng như post
      padding: 'Default'
    };
  
    if (hasMention) {
      card.msteams = {
        entities: [
          {
            type: 'mention',
            text: `<at>${safeName}</at>`,
            mentioned: {
              id: assigneeEmail.trim(),
              name: safeName
            }
          }
        ]
      };
    }
  
    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: card
        }
      ]
    };
  }

  async sendIssueNotification(payload: TeamsIssueNotificationPayload): Promise<void> {
    const webhookUrl = env.teams.workflowWebhookUrl?.trim();
    if (!webhookUrl) {
      this.logger.warn('TEAMS_WORKFLOW_WEBHOOK_URL is empty; skip Teams notification');
      return;
    }

    const message = this.buildAdaptiveCardMessage(payload);

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, message, {
          headers: { 'Content-Type': 'application/json' },
          maxRedirects: 0,
          validateStatus: (s) => s >= 200 && s < 300
        })
      );
      this.logger.log('Teams workflow notification sent');
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      this.logger.error(
        `Teams notification failed: ${JSON.stringify(err?.response?.data ?? err?.message ?? error)}`
      );
      throw error;
    }
  }
}
