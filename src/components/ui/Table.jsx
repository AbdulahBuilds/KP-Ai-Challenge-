import React from 'react';

/**
 * Reusable Table components adhering to DESIGN_SYSTEM.md:
 * - Clean white background
 * - Clear column headings
 * - Subtle row dividers (#E2E8F0)
 * - Responsive container
 */
export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-surface-border bg-white shadow-sm">
      <table className={`w-full text-left text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-white text-typography-secondary text-xs font-semibold uppercase tracking-wider border-b border-surface-border ${className}`}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className = '', hover = true, ...props }) {
  return (
    <tr
      className={`border-b border-surface-border/70 last:border-b-0 ${
        hover ? 'hover:bg-surface-subtle/40 transition-colors' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', align = 'left' }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th className={`px-4 py-3.5 ${alignClass} font-semibold text-typography-secondary ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-surface-border/60 ${className}`}>
      {children}
    </tbody>
  );
}

export function TableCell({ children, className = '', align = 'left' }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <td className={`px-4 py-3.5 ${alignClass} text-sm text-typography-primary ${className}`}>
      {children}
    </td>
  );
}

export default Table;

