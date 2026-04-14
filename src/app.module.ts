import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { env } from './configs/env.config';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { IssueModule } from './modules/issue/issue.module';

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
      logging: env.db.logging
    }),
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${env.redis.host}:${env.redis.port}`,
    }),
    BullModule.forRoot({
      connection: {
        host: env.redis.host,
        port: env.redis.port,
      }
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    IssueModule,
    WebhooksModule
  ]
})
export class AppModule {}
