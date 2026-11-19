import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  actorId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          organizationId: input.organizationId ?? null,
          actorId: input.actorId ?? null,
          before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
    }
  }
}
