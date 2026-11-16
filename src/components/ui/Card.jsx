import React from 'react';

/**
 * Reusable Card adhering to DESIGN_SYSTEM.md:
 * - White background (#FFFFFF)
 * - Subtle border (#E2E8F0)
 * - 12px border radius (rounded-xl)
 * - Soft shadow (shadow-sm)
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-xl border border-surface-border shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-5 pb-3 border-b border-surface-border/60 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-[15px] md:text-base font-semibold text-typography-primary ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs text-typography-secondary mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`p-4 pt-3 border-t border-surface-border/60 bg-surface-main/50 rounded-b-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;

