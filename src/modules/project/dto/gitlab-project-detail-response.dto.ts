import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GitlabProjectDetailResponseDto {
  @ApiPropertyOptional({ example: 12345 })
  id?: number;

  @ApiPropertyOptional({ example: 'eesaas-tenant-communication-api' })
  name?: string;

  @ApiPropertyOptional({ example: 'group/eesaas-tenant-communication-api' })
  path_with_namespace?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  web_url?: string;
}
