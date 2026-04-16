import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { buildRedisUrl, env } from './configs/env.config';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { IssueModule } from './modules/issue/issue.module';
import { ProjectModule } from './modules/project/project.module';
import { UserModule } from './modules/user/user.module';

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
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    IssueModule,
    ProjectModule,
    UserModule,
    WebhooksModule
  ]
})
export class AppModule {}
