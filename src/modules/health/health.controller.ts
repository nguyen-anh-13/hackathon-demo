import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2026-04-14T09:00:00.000Z' }
      }
    }
  })
  check(): { ok: boolean; timestamp: string } {
    return {
      ok: true,
      timestamp: new Date().toISOString()
    };
  }
}
