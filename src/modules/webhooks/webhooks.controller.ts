import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('google-sheets')
  @ApiOperation({ summary: 'Receive Google Sheets webhook payload' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true }
      }
    }
  })
  async receiveGoogleSheetsWebhook(@Body() payload: unknown): Promise<{ received: boolean }> {
    this.logger.log(`Google Sheets webhook payload: ${JSON.stringify(payload)}`);
    await this.webhooksService.handleGoogleSheetsWebhook(payload);

    return { received: true };
  }
}
