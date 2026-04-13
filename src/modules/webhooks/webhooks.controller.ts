import { Body, Controller, Logger, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('google-sheets')
  async receiveGoogleSheetsWebhook(@Body() payload: unknown): Promise<{ received: boolean }> {
    this.logger.log(`Google Sheets webhook payload: ${JSON.stringify(payload)}`);
    await this.webhooksService.handleGoogleSheetsWebhook(payload);

    return { received: true };
  }
}
