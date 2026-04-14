import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from './configs/env.config';

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
