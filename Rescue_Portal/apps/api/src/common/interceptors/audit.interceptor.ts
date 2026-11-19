import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import type { AuthUser } from '../types/auth-user';

/**
 * Records successful state-changing requests. Bodies are not stored (may contain
 * patient information). Domain services add richer audit entries for critical actions.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser; requestId?: string }>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next.handle();
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';
    if (path.includes('/auth/')) return next.handle();

    const user = request.user;
    const segments = path.replace(/^\/api\/v1\//, '').split('/');
    const entityType = segments[0] || 'unknown';
    const entityId = segments[1] && segments[1].length > 8 ? segments[1] : undefined;

    const record = (status: number) =>
      this.audit
        .record({
          action: `HTTP_${request.method} ${path}`,
          entityType,
          entityId,
          organizationId: user?.organizationId ?? null,
          actorId: user?.id ?? null,
          after: { statusCode: status },
          ipAddress: request.ip ?? null,
          userAgent: request.headers['user-agent'] ?? null,
        })
        .catch(() => undefined);

    return next.handle().pipe(
      tap(() => {
        void record(200);
      }),
      catchError((error: unknown) => {
        void record(400);
        return throwError(() => error);
      }),
    );
  }
}
