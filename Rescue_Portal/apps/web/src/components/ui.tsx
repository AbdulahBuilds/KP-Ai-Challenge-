import type { ReactNode } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { cn, alertStatusLabel, titleCase } from '@/lib/utils';

const STYLES: Record<string, string> = {
  CRITICAL: 'bg-rose-100 text-rose-800 ring-rose-200',
  HIGH: 'bg-orange-100 text-orange-800 ring-orange-200',
  MODERATE: 'bg-amber-50 text-amber-800 ring-amber-200',
  LOW: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  UNKNOWN: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  ELIGIBLE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  UNCONFIRMED: 'bg-amber-50 text-amber-800 ring-amber-200',
  INELIGIBLE: 'bg-rose-50 text-rose-700 ring-rose-200',
  FRESH: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  STALE: 'bg-amber-50 text-amber-800 ring-amber-200',
  EXPIRED: 'bg-rose-50 text-rose-700 ring-rose-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  LIMITED: 'bg-amber-50 text-amber-800 ring-amber-200',
  UNAVAILABLE: 'bg-rose-50 text-rose-700 ring-rose-200',
  OUTDATED: 'bg-orange-50 text-orange-700 ring-orange-200',
  PENDING: 'bg-slate-100 text-slate-700 ring-slate-200',
  SENT: 'bg-blue-50 text-blue-700 ring-blue-200',
  DELIVERED: 'bg-sky-50 text-sky-700 ring-sky-200',
  ACKNOWLEDGED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
  FAILED: 'bg-rose-100 text-rose-800 ring-rose-200',
  MOCK: 'bg-amber-100 text-amber-900 ring-amber-300',
  LIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function Badge({ value, label, className }: { value: string; label?: string; className?: string }) {
  const key = value?.toUpperCase?.() ?? value;
  const display =
    label ??
    (['PENDING', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'FAILED'].includes(key)
      ? String(alertStatusLabel(key))
      : titleCase(key || 'Unknown'));
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        STYLES[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
        className,
      )}
    >
      {display}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card-surface', className)}>{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry ? (
          <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger';
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      {children}
    </div>
  );
}

export function MockNotice({ children }: { children?: ReactNode }) {
  return (
    <Notice tone="warning" title="Demo data">
      {children ?? 'Hospital information shown here is simulated demo data, not real hospital availability.'}
    </Notice>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="label-base">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
