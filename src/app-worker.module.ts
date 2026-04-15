import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildRedisUrl, env } from './configs/env.config';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: env.db.host,
      port: env.db.port,
      username: env.db.user,
      password: env.db.password,
      database: env.db.name,
      autoLoadEntities: true,
      synchronize: false,
      ssl: env.db.ssl,
      ...(env.nodeEnv !== 'dev'
        ? {
            extra: {
              ssl: {
                rejectUnauthorized: false
              }
            }
          }
        : {}),
      logging: env.db.logging
    }),
    RedisModule.forRoot({
      type: 'single',
      url: buildRedisUrl()
    }),
    BullModule.forRoot({
      connection: {
        host: env.redis.host,
        port: env.redis.port,
        ...(env.redis.password ? { password: env.redis.password } : {})
      }
    })
  ]
})
export class AppWorkerModule {}
