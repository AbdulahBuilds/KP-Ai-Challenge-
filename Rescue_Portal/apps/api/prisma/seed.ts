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

const DEMO_ACCOUNTS = [
  { email: 'admin@rescueportal.local', firstName: 'Rescue', lastName: 'Administrator' },
  { email: 'admin@rescue-one.local', firstName: 'Rescue', lastName: 'Organization Admin' },
  { email: 'dispatcher@rescue-one.local', firstName: 'Rescue', lastName: 'Dispatcher' },
  { email: 'leader@rescue-one.local', firstName: 'Rescue', lastName: 'Team Leader' },
  { email: 'paramedic@rescue-one.local', firstName: 'Rescue', lastName: 'Paramedic' },
  { email: 'auditor@rescue-one.local', firstName: 'Rescue', lastName: 'Auditor' },
];

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

  const accounts = new Map<string, { firstName: string; lastName: string; password: string }>();
  if (process.env.SEED_DEMO_ACCOUNTS !== 'false') {
    for (const account of DEMO_ACCOUNTS) {
      accounts.set(account.email, {
        firstName: account.firstName,
        lastName: account.lastName,
        password: 'Rescue@12345',
      });
    }
  }
  accounts.set(email, { firstName: 'Rescue', lastName: 'Admin', password });

  const rescueRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLES.RESCUE_ADMIN } });
  for (const [accountEmail, account] of accounts) {
    const user = await prisma.user.upsert({
      where: { email: accountEmail },
      create: {
        email: accountEmail,
        passwordHash: await hash(account.password),
        firstName: account.firstName,
        lastName: account.lastName,
        status: 'ACTIVE',
        organizationId: organization.id,
      },
      update: {
        passwordHash: await hash(account.password),
        firstName: account.firstName,
        lastName: account.lastName,
        status: 'ACTIVE',
        organizationId: organization.id,
        deletedAt: null,
      },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: rescueRole.id } });
  }

  console.log(`Seed complete. ${accounts.size} Rescue Admin account(s) configured.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
