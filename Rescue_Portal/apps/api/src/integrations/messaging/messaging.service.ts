import { Injectable } from '@nestjs/common';
import { MockMessagingAdapter } from './mock-messaging.adapter';

/**
 * External messaging facade. Only the mock adapter is enabled until an SMS or
 * email provider is contracted and configured. Internal notifications are
 * handled by the NotificationsService and do not depend on this.
 */
@Injectable()
export class MessagingService {
  readonly provider = 'mock';

  constructor(private readonly mock: MockMessagingAdapter) {}

  status() {
    return {
      provider: this.provider,
      isMock: true,
      notice: 'MOCK messaging: SMS and email are logged only and are never transmitted.',
    };
  }

  sendSms(to: string, body: string) {
    return this.mock.sendSms(to, body);
  }

  sendEmail(to: string, subject: string, body: string) {
    return this.mock.sendEmail(to, subject, body);
  }
}
