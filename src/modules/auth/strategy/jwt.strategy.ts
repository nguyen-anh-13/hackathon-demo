import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Request } from 'express';
import Redis from 'ioredis';
import { env } from '../../../configs/env.config';
import { UserEntity } from '../../../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwt.accessSecret,
      passReqToCallback: true
    });
  }

  async validate(req: Request, payload: { id: number; username: string }): Promise<Omit<UserEntity, 'password'>> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const blacklisted = token ? await this.redis.get(`access_token:${token}`) : null;
    if (blacklisted) {
      throw new UnauthorizedException('Token has been blacklisted');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.id }
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
