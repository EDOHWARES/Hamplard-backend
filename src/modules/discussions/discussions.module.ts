import { Module } from '@nestjs/common';
import { DiscussionsController } from './discussions.controller';
import { CommentModerationService } from './comment-moderation.service';
import { DiscussionsService } from './discussions.service';

@Module({
  controllers: [DiscussionsController],
  providers: [CommentModerationService, DiscussionsService],
  exports: [CommentModerationService, DiscussionsService],
})
export class DiscussionsModule {}
