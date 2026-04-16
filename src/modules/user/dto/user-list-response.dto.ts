import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UserListResponseDto {
  @ApiProperty({ type: UserResponseDto, isArray: true })
  data: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiPropertyOptional({ description: 'Present when pagination query params were used' })
  page?: number;

  @ApiPropertyOptional({ description: 'Present when pagination query params were used' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Present when pagination query params were used' })
  totalPages?: number;
}
