import { createHash, randomBytes, randomUUID } from 'node:crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

export function uuid(): string {
  return randomUUID();
}

export function generateCaseNumber(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `RSQ-${y}${m}${d}-${suffix}`;
}

export function generateOrganizationCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `${base || 'ORG'}-${suffix}`;
}
