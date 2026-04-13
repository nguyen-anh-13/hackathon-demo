import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { env } from './configs/env.config';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
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
    WebhooksModule
  ]
})
export class AppModule {}
