// notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { QueueModule } from '../../common/queue/queue.module';
import { NotificationEmailProcessor } from './notification-email.processor';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [QueueModule],
  providers: [NotificationsService, NotificationEmailProcessor, SmsService],
  controllers: [NotificationsController, SmsController],
  exports: [NotificationsService, SmsService],
})
export class NotificationsModule {}
