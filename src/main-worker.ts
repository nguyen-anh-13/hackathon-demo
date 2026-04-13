import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppWorkerModule } from './app-worker.module';

async function bootstrapWorker(): Promise<void> {
  await NestFactory.createApplicationContext(AppWorkerModule);
  Logger.log('Worker context started', 'BootstrapWorker');
}

void bootstrapWorker();
