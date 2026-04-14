import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueEntity } from '../../entities/issue.entity';
import { UserEntity } from '../../entities/user.entity';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { GITLAB_TICKET_QUEUE } from '../webhooks/webhooks.constants';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IssueEntity, UserEntity]),
    BullModule.registerQueue({
      name: GITLAB_TICKET_QUEUE
    }),
    WebhooksModule
  ],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService]
})
export class IssueModule {}
