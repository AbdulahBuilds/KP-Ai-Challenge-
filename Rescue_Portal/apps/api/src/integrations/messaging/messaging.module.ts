import { Module } from '@nestjs/common';
import { MockMessagingAdapter } from './mock-messaging.adapter';
import { MessagingService } from './messaging.service';

@Module({
  providers: [MockMessagingAdapter, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
