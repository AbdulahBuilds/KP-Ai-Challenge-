import path from 'node:path';
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  ROLES,
} from '../src/common/constants/permissions';

loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seedPermissions(): Promise<void> {
  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, description: PERMISSION_DESCRIPTIONS[code] ?? code },
      update: { description: PERMISSION_DESCRIPTIONS[code] ?? code },
    });
  }

  for (const roleCode of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      create: {
        code: roleCode,
        name: ROLE_NAMES[roleCode] ?? roleCode,
        description: 'Seeded system role',
      },
      update: { name: ROLE_NAMES[roleCode] ?? roleCode },
    });
    const permissions = await prisma.permission.findMany({
      where: { code: { in: ROLE_PERMISSIONS[roleCode] ?? [] } },
      select: { id: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      });
    }
  }
}

async function main(): Promise<void> {
  const email = process.env.RESCUE_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.RESCUE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'RESCUE_ADMIN_EMAIL and RESCUE_ADMIN_PASSWORD must be configured to seed the Rescue Admin account.',
    );
  }

  await seedPermissions();

  const organization = await prisma.organization.upsert({
    where: { code: 'RESCUE' },
    create: {
      name: 'Rescue Portal',
      code: 'RESCUE',
      status: 'VERIFIED',
      email,
      phone: 'N/A',
      verifiedAt: new Date(),
    },
    update: { status: 'VERIFIED', email, phone: 'N/A', verifiedAt: new Date() },
  });

  // Keep only the configured Rescue Admin account/role for this deployment.
  await prisma.refreshToken.deleteMany({ where: { user: { email: { not: email } } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { not: email } } } }).catch(() => undefined);
  await prisma.invitation.deleteMany({}).catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { not: email } } });

  const rescueRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLES.RESCUE_ADMIN } });
  const passwordHash = await hash(password);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      firstName: 'Rescue',
      lastName: 'Admin',
      status: 'ACTIVE',
      organizationId: organization.id,
    },
    update: {
      passwordHash,
      firstName: 'Rescue',
      lastName: 'Admin',
      status: 'ACTIVE',
      organizationId: organization.id,
      deletedAt: null,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: admin.id } });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: rescueRole.id } });

  await prisma.rolePermission.deleteMany({ where: { role: { code: { not: ROLES.RESCUE_ADMIN } } } }).catch(() => undefined);
  await prisma.role.deleteMany({ where: { code: { not: ROLES.RESCUE_ADMIN } } }).catch(() => undefined);

  console.log('Seed complete. Rescue Admin account is configured.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
