import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HospitalsService } from '../modules/hospitals/hospitals.service';

/**
 * Lightweight in-process workers. Safe for a single API instance and uses
 * atomic claims so multiple instances do not process the same outbox row.
 */
@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersService.name);
  private outboxTimer?: NodeJS.Timeout;
  private hospitalTimer?: NodeJS.Timeout;
  private retentionTimer?: NodeJS.Timeout;
  private outboxRunning = false;
  private hospitalRunning = false;
  private retentionRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly hospitals: HospitalsService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('WORKERS_ENABLED', 'true') !== 'true') {
      this.logger.warn('Background workers are disabled');
      return;
    }
    const outboxInterval = Number(this.config.get<string>('OUTBOX_POLL_INTERVAL_MS', '5000'));
    const hospitalInterval = Number(this.config.get<string>('HOSPITAL_POLL_INTERVAL_MS', '15000'));
    this.outboxTimer = setInterval(() => void this.processOutbox(), Math.max(1000, outboxInterval));
    this.hospitalTimer = setInterval(() => void this.pollHospitals(), Math.max(5000, hospitalInterval));
    this.retentionTimer = setInterval(() => void this.applyRetention(), 6 * 60 * 60 * 1000);
    setTimeout(() => {
      void this.processOutbox();
      void this.pollHospitals();
    }, 3000);
    this.logger.log(
      `Workers started (outbox ${outboxInterval}ms, hospital poll ${hospitalInterval}ms, retention 6h)`,
    );
  }

  onModuleDestroy(): void {
    if (this.outboxTimer) clearInterval(this.outboxTimer);
    if (this.hospitalTimer) clearInterval(this.hospitalTimer);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
  }

  async processOutbox(): Promise<void> {
    if (this.outboxRunning) return;
    this.outboxRunning = true;
    try {
      const events = await this.prisma.integrationOutbox.findMany({
        where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } },
        orderBy: { nextAttemptAt: 'asc' },
        take: 10,
      });
      for (const event of events) {
        const claimed = await this.prisma.integrationOutbox.updateMany({
          where: { id: event.id, status: 'PENDING' },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });
        if (claimed.count === 0) continue;
        try {
          if (event.eventType === 'HOSPITAL_REQUEST_DISPATCH') {
            await this.hospitals.processOutboxPayload(event.payload);
          } else {
            throw new Error(`No handler for outbox event type ${event.eventType}`);
          }
          await this.prisma.integrationOutbox.update({
            where: { id: event.id },
            data: { status: 'SENT', processedAt: new Date(), lastError: null },
          });
        } catch (error) {
          const attempts = event.attempts + 1;
          const dead = attempts >= event.maxAttempts;
          await this.prisma.integrationOutbox.update({
            where: { id: event.id },
            data: {
              status: dead ? 'DEAD' : 'PENDING',
              lastError: (error as Error).message.slice(0, 500),
              nextAttemptAt: new Date(Date.now() + Math.min(5 * 60_000, 2 ** attempts * 1000)),
              ...(dead ? { processedAt: new Date() } : {}),
            },
          });
          this.logger.warn(
            `Outbox event ${event.id} (${event.eventType}) failed attempt ${attempts}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Outbox polling failed: ${(error as Error).message}`);
    } finally {
      this.outboxRunning = false;
    }
  }

  async pollHospitals(): Promise<void> {
    if (this.hospitalRunning) return;
    this.hospitalRunning = true;
    try {
      const count = await this.hospitals.pollOpenRequests();
      if (count > 0) this.logger.log(`Polled ${count} open hospital request(s)`);
    } catch (error) {
      this.logger.error(`Hospital request polling failed: ${(error as Error).message}`);
    } finally {
      this.hospitalRunning = false;
    }
  }

  async applyRetention(): Promise<void> {
    if (this.retentionRunning) return;
    this.retentionRunning = true;
    try {
      const staleTokens = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      });
      const staleResets = await this.prisma.passwordResetToken
        .deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
              { usedAt: { not: null } },
            ],
          },
        })
        .catch(() => ({ count: 0 }));
      const staleOutbox = await this.prisma.integrationOutbox.deleteMany({
        where: {
          status: { in: ['SENT', 'DEAD'] },
          createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      });
      this.logger.log(
        `Retention run: refreshTokens=${staleTokens.count}, passwordResets=${(staleResets as any).count ?? 0}, outbox=${staleOutbox.count}`,
      );
    } catch (error) {
      this.logger.error(`Retention worker failed: ${(error as Error).message}`);
    } finally {
      this.retentionRunning = false;
    }
  }
}
