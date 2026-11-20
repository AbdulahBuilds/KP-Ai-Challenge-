import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AlertDisplayStatus, CapabilityEvaluation, ComparisonStatus, Freshness, RecommendationSummaryRow } from './types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function relativeTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '—';
  const diff = Math.round((date - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (Math.abs(diff) < 60) return formatter.format(diff, 'second');
  if (Math.abs(diff) < 3600) return formatter.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86_400) return formatter.format(Math.round(diff / 3600), 'hour');
  return formatter.format(Math.round(diff / 86_400), 'day');
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'RA';
}

export function hasPermission(user: { permissions: string[] } | null | undefined, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function comparisonStatus(cap: CapabilityEvaluation | undefined, freshness: Freshness): ComparisonStatus {
  if (!cap) return 'UNKNOWN';
  if (freshness === 'EXPIRED' || freshness === 'STALE') return 'OUTDATED';
  if (cap.status === 'AVAILABLE') {
    if (typeof cap.quantity === 'number' && cap.quantity <= 1) return 'LIMITED';
    return 'AVAILABLE';
  }
  if (cap.status === 'UNAVAILABLE') return 'UNAVAILABLE';
  return 'UNKNOWN';
}

export function capabilityFor(row: RecommendationSummaryRow, code: string): CapabilityEvaluation | undefined {
  return row.capabilityEvaluations.find((c) => c.code === code);
}

export function formatDistanceKm(distanceKm: number | null | undefined, estimated: boolean): string {
  if (distanceKm == null || Number.isNaN(distanceKm)) return 'Unavailable';
  const label = `${distanceKm.toFixed(1)} km`;
  return estimated ? `${label} (estimated)` : label;
}

export function formatEtaMinutes(etaMinutes: number | null | undefined, estimated: boolean): string {
  if (etaMinutes == null || Number.isNaN(etaMinutes)) return 'Unavailable';
  const label = `${Math.round(etaMinutes)} min`;
  return estimated ? `${label} (estimated)` : label;
}

export function alertStatusLabel(status?: string | null): AlertDisplayStatus | string {
  if (!status) return 'PENDING';
  const normalized = status.toUpperCase();
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'SENT') return 'SENT';
  if (normalized === 'DELIVERED') return 'DELIVERED';
  if (normalized === 'ACKNOWLEDGED' || normalized === 'MORE_INFO') return 'ACKNOWLEDGED';
  if (normalized === 'ACCEPTED') return 'ACCEPTED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'TIMED_OUT' || normalized === 'FAILED' || normalized === 'CANCELLED') return 'FAILED';
  return normalized;
}

export function alertStatusTone(status?: string | null): string {
  const label = alertStatusLabel(status);
  switch (label) {
    case 'ACCEPTED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'ACKNOWLEDGED':
    case 'DELIVERED':
    case 'SENT':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'PENDING':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    case 'REJECTED':
    case 'FAILED':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}
