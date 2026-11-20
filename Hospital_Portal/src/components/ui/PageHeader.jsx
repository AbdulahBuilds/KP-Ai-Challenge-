import React from 'react';

/**
 * Reusable PageHeader adhering to DESIGN_SYSTEM.md:
 * - Page titles: 24-28px, SemiBold
 * - Secondary info: 14-15px Regular
 * - Actions slot
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl md:text-[26px] font-semibold text-typography-primary tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-typography-secondary mt-1 max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

