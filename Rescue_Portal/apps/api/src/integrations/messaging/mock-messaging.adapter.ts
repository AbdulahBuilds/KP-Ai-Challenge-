import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MessageResult, MessagingProvider } from './messaging.types';

/** Mock SMS/email provider. Messages are logged, never transmitted. */
@Injectable()
export class MockMessagingAdapter implements MessagingProvider {
  readonly name = 'mock';
  readonly isMock = true;
  private readonly logger = new Logger(MockMessagingAdapter.name);

  async sendSms(to: string, body: string): Promise<MessageResult> {
    this.logger.log(`[MOCK SMS] to=${to} chars=${body.length}`);
    return { accepted: true, providerMessageId: `mock-sms-${randomUUID()}`, provider: this.name, isMock: true };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<MessageResult> {
    this.logger.log(`[MOCK EMAIL] to=${to} subject="${subject}" chars=${body.length}`);
    return { accepted: true, providerMessageId: `mock-email-${randomUUID()}`, provider: this.name, isMock: true };
  }
}
