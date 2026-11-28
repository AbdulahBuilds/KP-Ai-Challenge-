import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { mongoNullish } from '../utils/prisma-mongo.util';
import type { AuthUser } from '../types/auth-user';

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

const demoUserInclude = {
  organization: { select: { id: true, name: true, status: true } },
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithAuth = Prisma.UserGetPayload<{ include: typeof demoUserInclude }>;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (this.config.get<string>('DEMO_AUTH_ENABLED', 'false') === 'true') {
      return this.applyDemoUser(request);
    }

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice(7).trim();
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (payload.type !== 'access') throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, ...mongoNullish('deletedAt'), status: 'ACTIVE' },
      include: demoUserInclude,
    });
    if (!user) throw new UnauthorizedException('Account is not active');
    if (user.organization && ['SUSPENDED', 'REJECTED'].includes(user.organization.status)) {
      throw new ForbiddenException('Organization is suspended or rejected');
    }

    request.user = this.toAuthUser(user);
    return true;
  }

  private async applyDemoUser(request: Request): Promise<boolean> {
    const email = this.config.get<string>('RESCUE_ADMIN_EMAIL')?.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: email
        ? { email, ...mongoNullish('deletedAt'), status: 'ACTIVE' }
        : {
            roles: { some: { role: { code: 'RESCUE_ADMIN' } } },
            ...mongoNullish('deletedAt'),
            status: 'ACTIVE',
          },
      include: demoUserInclude,
    });
    if (!user) throw new UnauthorizedException('No active Rescue Admin is available for demo access');
    request.user = this.toAuthUser(user);
    return true;
  }

  private toAuthUser(user: UserWithAuth): AuthUser {
    const roles = user.roles.map((assignment) => assignment.role.code);
    const permissions = Array.from(
      new Set(user.roles.flatMap((assignment) => assignment.role.permissions.map((entry) => entry.permission.code))),
    );
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      organizationStatus: user.organization?.status ?? null,
      roles,
      permissions,
      status: user.status,
    };
  }
}
