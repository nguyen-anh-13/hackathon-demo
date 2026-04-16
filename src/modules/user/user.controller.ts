import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'List users',
    description:
      'Without `page` and `limit`, returns all users. Pass either (or both) to paginate (`page` defaults to 1, `limit` to 20 when the other is set).'
  })
  @ApiOkResponse({ type: UserListResponseDto })
  list(@Query() query: ListUsersQueryDto): Promise<UserListResponseDto> {
    return this.userService.list(query);
  }
}
