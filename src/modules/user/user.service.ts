import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async list(query: ListUsersQueryDto): Promise<UserListResponseDto> {
    const usePagination = query.page !== undefined || query.limit !== undefined;
    const order = { id: 'ASC' as const };

    if (usePagination) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const [rows, total] = await this.userRepository.findAndCount({
        order,
        skip: (page - 1) * limit,
        take: limit
      });
      const data = rows.map((u) => this.toUserResponse(u));
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      };
    }

    const rows = await this.userRepository.find({ order });
    const data = rows.map((u) => this.toUserResponse(u));
    return {
      data,
      total: data.length
    };
  }

  private toUserResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      created_at: user.created_at,
      updated_at: user.updated_at,
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      state: user.state
    };
  }
}
