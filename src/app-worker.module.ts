import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { env } from './configs/env.config';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${env.redis.host}:${env.redis.port}`
    }),
    BullModule.forRoot({
      connection: {
        host: env.redis.host,
        port: env.redis.port,
      }
    })
  ]
})
export class AppWorkerModule {}
