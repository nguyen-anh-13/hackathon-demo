import { InjectRedis } from '@nestjs-modules/ioredis';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compareSync } from 'bcrypt';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { env } from '../../configs/env.config';
import { UserEntity } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type JwtPayload = {
  id: number;
  username: string;
  jti?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>
  ) {}

  async login(loginDto: LoginDto): Promise<{ access_token: string; refresh_token: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username: loginDto.username })
      .getOne();

    const message = 'Username or password is invalid';
    if (!user || !compareSync(loginDto.password, user.password)) {
      throw new BadRequestException(message);
    }

    const jti = randomUUID();
    const payload: JwtPayload = { id: user.id, username: user.username, jti };
    const tokens = await this.generateTokens(payload);

    await this.redis.set(`refresh_token:${jti}`, String(user.id), 'EX', env.jwt.refreshTtlSeconds);

    return tokens;
  }

  async me(userId: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async refreshToken(refreshDto: RefreshTokenDto): Promise<{ access_token: string; refresh_token: string }> {
    const message = 'Invalid or expired refresh token';
    let decoded: JwtPayload;
    try {
      decoded = await this.jwtService.verifyAsync<JwtPayload>(refreshDto.refresh_token, {
        secret: env.jwt.refreshSecret
      });
    } catch {
      throw new UnauthorizedException(message);
    }

    if (!decoded.jti) {
      throw new UnauthorizedException(message);
    }

    const redisKey = `refresh_token:${decoded.jti}`;
    const value = await this.redis.get(redisKey);
    if (!value || Number(value) !== decoded.id) {
      throw new UnauthorizedException(message);
    }

    const user = await this.userRepository.findOne({ where: { id: decoded.id } });
    if (!user) {
      await this.redis.del(redisKey);
      throw new UnauthorizedException('User not found');
    }

    await this.redis.set(redisKey, String(user.id), 'EX', 5);

    const nextJti = randomUUID();
    const payload: JwtPayload = { id: user.id, username: user.username, jti: nextJti };
    const tokens = await this.generateTokens(payload);
    await this.redis.set(`refresh_token:${nextJti}`, String(user.id), 'EX', env.jwt.refreshTtlSeconds);

    return tokens;
  }

  async logout(logoutDto: LogoutDto, req: Request): Promise<{ message: string }> {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!accessToken) {
      throw new UnauthorizedException('Access token is required');
    }

    const refreshDecoded = await this.jwtService.verifyAsync<JwtPayload>(logoutDto.refresh_token, {
      secret: env.jwt.refreshSecret
    });
    const accessDecoded = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
      secret: env.jwt.accessSecret
    });

    if (!refreshDecoded.jti || refreshDecoded.id !== accessDecoded.id) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.redis.del(`refresh_token:${refreshDecoded.jti}`);

    const now = Math.floor(Date.now() / 1000);
    const ttl = ((accessDecoded as unknown as { exp?: number }).exp || now) - now;
    if (ttl > 0) {
      await this.redis.set(`access_token:${accessToken}`, String(accessDecoded.id), 'EX', ttl);
    }

    return { message: 'Logout successfully' };
  }

  private async generateTokens(payload: JwtPayload): Promise<{ access_token: string; refresh_token: string }> {
    const access_token = await this.jwtService.signAsync(
      { id: payload.id, username: payload.username },
      { secret: env.jwt.accessSecret, expiresIn: env.jwt.accessExpiresIn as any }
    );
    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: env.jwt.refreshSecret,
      expiresIn: env.jwt.refreshExpiresIn as any
    });
    return { access_token, refresh_token };
  }
}
