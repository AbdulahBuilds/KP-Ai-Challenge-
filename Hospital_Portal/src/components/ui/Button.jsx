import React from 'react';

/**
 * Reusable Button adhering to DESIGN_SYSTEM.md:
 * - 8px border radius (rounded-btn / rounded-lg)
 * - Primary uses portal accent (#164E78)
 * - Secondary uses white background + subtle border (#E2E8F0)
 * - Destructive uses red (#DC2626)
 * - Hover, focus, disabled, and loading states
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-lg select-none active:scale-[0.98]';

  const sizeClasses = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 h-7',
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-9',
    lg: 'text-sm font-semibold px-5 py-2.5 gap-2.5 h-10',
  }[size] || 'text-sm px-4 py-2 gap-2 h-9';

  const variantClasses = {
    primary: 'bg-brand-primary hover:bg-brand-primaryHover active:bg-brand-800 text-white focus:ring-brand-primary/40 shadow-xs border border-transparent',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-typography-primary border border-surface-border hover:border-slate-300 focus:ring-slate-300 shadow-xs',
    destructive: 'bg-status-declined hover:bg-emergency-700 active:bg-emergency-800 text-white focus:ring-status-declined/40 shadow-xs border border-transparent',
    outline: 'bg-transparent border border-brand-primary text-brand-primary hover:bg-brand-50 active:bg-brand-100 focus:ring-brand-primary/30',
    ghost: 'bg-transparent text-typography-secondary hover:text-typography-primary hover:bg-slate-100/80 active:bg-slate-200/80 focus:ring-slate-200',
    success: 'bg-status-accepted hover:bg-emerald-700 active:bg-emerald-800 text-white focus:ring-status-accepted/40 shadow-xs border border-transparent',
    teal: 'bg-brand-teal hover:bg-brand-tealHover active:bg-teal-800 text-white focus:ring-brand-teal/40 shadow-xs border border-transparent',
  }[variant] || 'bg-brand-primary hover:bg-brand-primaryHover text-white shadow-xs';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-3.5 w-3.5 mr-1.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      ) : Icon ? (
        <Icon className={size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      ) : null}
      {children}
    </button>
  );
}
