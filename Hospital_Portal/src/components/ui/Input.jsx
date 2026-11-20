import React from 'react';

/**
 * Reusable Form Input adhering to DESIGN_SYSTEM.md:
 * - White input background
 * - Light gray border (#E2E8F0)
 * - Clear label above input (13-14px Medium)
 * - Consistent 8px radius (rounded-lg)
 * - Focus state using healthcare blue
 */
export function Input({
  label,
  error,
  helperText,
  required = false,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[13px] md:text-sm font-medium text-typography-primary"
        >
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full h-10 px-3.5 py-2 text-sm bg-white border border-surface-border rounded-lg text-typography-primary placeholder:text-typography-secondary/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors disabled:bg-slate-50 disabled:text-typography-secondary ${
          error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : ''
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-[#DC2626] mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-typography-secondary mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  error,
  required = false,
  children,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[13px] md:text-sm font-medium text-typography-primary"
        >
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full h-10 px-3 py-2 text-sm bg-white border border-surface-border rounded-lg text-typography-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-colors disabled:bg-slate-50 ${
          error ? 'border-[#DC2626] focus:border-[#DC2626]' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}

export default Input;

