export interface MessageResult {
  accepted: boolean;
  providerMessageId: string | null;
  provider: string;
  isMock: boolean;
}

export interface MessagingProvider {
  readonly name: string;
  readonly isMock: boolean;
  sendSms(to: string, body: string): Promise<MessageResult>;
  sendEmail(to: string, subject: string, body: string): Promise<MessageResult>;
}
