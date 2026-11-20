import React from 'react';

/**
 * Modern Clinical StatCard:
 * - 12px rounded-xl border with subtle shadow
 * - Never wraps awkwardly or breaks on small widths
 * - High readability values with clean progress bar
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  progress = null,
  progressColor = '',
  trend = null,
  className = '',
  onClick
}) {
  const variantStyles = {
    default: {
      card: 'bg-white border-surface-border hover:border-slate-300',
      iconBox: 'bg-slate-50 text-slate-700 border border-slate-200/80',
      value: 'text-typography-primary',
      progressBar: 'bg-brand-primary',
    },
    success: {
      card: 'bg-white border-surface-border hover:border-emerald-200',
      iconBox: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      value: 'text-typography-primary',
      progressBar: 'bg-emerald-500',
    },
    warning: {
      card: 'bg-white border-surface-border hover:border-amber-200',
      iconBox: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      value: 'text-typography-primary',
      progressBar: 'bg-amber-500',
    },
    critical: {
      card: 'bg-white border-rose-200 hover:border-rose-300 ring-1 ring-rose-200/60',
      iconBox: 'bg-rose-100 text-rose-700 border border-rose-200',
      value: 'text-rose-700',
      progressBar: 'bg-rose-600',
    },
    teal: {
      card: 'bg-white border-surface-border hover:border-teal-200',
      iconBox: 'bg-teal-50 text-teal-700 border border-teal-200/80',
      value: 'text-typography-primary',
      progressBar: 'bg-teal-600',
    },
  }[variant] || variantStyles.default;

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-xl border shadow-xs transition-all duration-150 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:shadow-card hover:-translate-y-0.5' : ''
      } ${variantStyles.card} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-typography-secondary tracking-tight">
          {title}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${variantStyles.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${variantStyles.value}`}>
            {value}
          </div>
          {trend && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-typography-secondary flex-shrink-0">
              {trend}
            </span>
          )}
        </div>

        {/* Capacity Progress Bar (if provided) */}
        {progress !== null && (
          <div className="mt-2.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressColor || variantStyles.progressBar}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {subtitle && (
          <div className="text-[11px] text-typography-secondary mt-1.5 font-normal">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
