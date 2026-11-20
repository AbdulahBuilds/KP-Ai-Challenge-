import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../../common/redis/redis.service';
import { randomToken, sha256, uuid } from '../../common/utils/crypto.util';
import { ROLE_PERMISSIONS } from '../../common/constants/permissions';
import { mongoNullish } from '../../common/utils/prisma-mongo.util';
import type { AuthUser } from '../../common/types/auth-user';
import type { LoginDto } from './dto/auth.dto';

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

const userAuthInclude = {
  organization: { select: { id: true, name: true, status: true } },
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithAuth = Prisma.UserGetPayload<{ include: typeof userAuthInclude }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    await this.enforceLoginRateLimit(normalizedEmail, meta.ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: userAuthInclude,
    });
    const validPassword = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !validPassword) {
      await this.audit.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'user',
        entityId: user?.id,
        organizationId: user?.organizationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        after: { reason: user ? 'invalid_password' : 'unknown_email' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new ForbiddenException('This account is not active.');
    }
    if (user.organization && ['SUSPENDED', 'REJECTED'].includes(user.organization.status)) {
      throw new ForbiddenException('Organization is not active.');
    }
    if (!user.roles.some((assignment) => assignment.role.code === 'RESCUE_ADMIN')) {
      throw new ForbiddenException('Access denied.');
    }

    const tokens = await this.issueTokens(user, meta, uuid());
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'user',
      entityId: user.id,
      organizationId: user.organizationId,
      actorId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async refresh(rawToken: string, meta: RequestMeta) {
    if (!rawToken) throw new UnauthorizedException('Refresh token is required');
    const tokenHash = sha256(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, ...mongoNullish('revokedAt') },
        data: { revokedAt: new Date() },
      });
      await this.audit.record({
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        entityType: 'refresh_token_family',
        entityId: stored.familyId,
        actorId: stored.userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Refresh token reuse detected. Sessions revoked.');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: stored.userId, ...mongoNullish('deletedAt'), status: 'ACTIVE' },
      include: userAuthInclude,
    });
    if (!user) throw new UnauthorizedException('Account is not active');
    if (user.organization && ['SUSPENDED', 'REJECTED'].includes(user.organization.status)) {
      throw new ForbiddenException('Organization is not active');
    }
    if (!user.roles.some((assignment) => assignment.role.code === 'RESCUE_ADMIN')) {
      throw new ForbiddenException('Access denied.');
    }

    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, ...mongoNullish('revokedAt') },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, ...mongoNullish('revokedAt') },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token already rotated');
    }

    const tokens = await this.issueTokens(user, meta, stored.familyId);
    const replacement = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(tokens.refreshToken) },
      select: { id: true },
    });
    if (replacement) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { replacedById: replacement.id } });
    }
    await this.audit.record({
      action: 'AUTH_TOKEN_REFRESHED',
      entityType: 'user',
      entityId: user.id,
      organizationId: user.organizationId,
      actorId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async logout(rawToken: string | undefined): Promise<{ message: string }> {
    if (rawToken) {
      const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(rawToken) } });
      if (stored && !stored.revokedAt) {
        await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      }
    }
    return { message: 'Logged out' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...mongoNullish('deletedAt') },
      include: userAuthInclude,
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.roles.some((assignment) => assignment.role.code === 'RESCUE_ADMIN')) {
      throw new ForbiddenException('Access denied.');
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(user: UserWithAuth, meta: RequestMeta, familyId: string): Promise<AuthTokens> {
    const accessTtl = Number(this.config.get<string>('JWT_ACCESS_TTL', '900'));
    const refreshTtl = Number(this.config.get<string>('JWT_REFRESH_TTL', '604800'));
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, type: 'access' },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: accessTtl },
    );
    const refreshToken = randomToken(48);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTtl,
      refreshTokenExpiresIn: refreshTtl,
    };
  }

  private toPublicUser(user: UserWithAuth) {
    const roles = user.roles.map((r) => r.role.code);
    const permissions = Array.from(
      new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))),
    );
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      organizationId: user.organizationId,
      organization: user.organization
        ? { id: user.organization.id, name: user.organization.name, status: user.organization.status }
        : null,
      roles,
      permissions: permissions.length > 0 ? permissions : ROLE_PERMISSIONS['RESCUE_ADMIN'] ?? [],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private async enforceLoginRateLimit(email: string, ip?: string | null): Promise<void> {
    const max = Number(this.config.get<string>('RATE_LIMIT_LOGIN_MAX', '10'));
    const windowSeconds = Number(this.config.get<string>('RATE_LIMIT_LOGIN_WINDOW_SECONDS', '900'));
    const keys = [`ratelimit:login:email:${email}`, `ratelimit:login:ip:${ip ?? 'unknown'}`];
    for (const key of keys) {
      const count = await this.redis.incrementWithTtl(key, windowSeconds);
      if (count > max) {
        throw new HttpException(
          `Too many login attempts. Try again in ${Math.ceil(windowSeconds / 60)} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
