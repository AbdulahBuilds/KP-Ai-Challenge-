import React from 'react';

/**
 * Standard StatusBadge adhering to DESIGN_SYSTEM.md Section 5:
 * Always display status text alongside its color.
 * Accepted/Available: #16A34A (Green)
 * Pending: #D97706 (Amber)
 * Declined/Critical: #DC2626 (Red)
 * Information: #2563EB (Blue)
 * Unavailable/Outdated: #64748B (Slate)
 */
export default function StatusBadge({ status, label, size = 'sm', className = '' }) {
  const normalized = (status || '').toUpperCase();

  let config = {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-[#16A34A]',
    pulse: false,
    defaultLabel: status,
  };

  switch (normalized) {
    case 'ACCEPTED':
    case 'AVAILABLE':
    case 'OPERATIONAL':
    case 'READY':
    case 'CONFIRMED':
    case 'FACILITIES_CONFIRMED':
      config = {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-[#16A34A]',
        pulse: false,
        defaultLabel: normalized === 'ACCEPTED' ? 'Accepted' : normalized === 'FACILITIES_CONFIRMED' ? 'Bay Ready' : 'Available',
      };
      break;

    case 'PENDING':
    case 'IN_PROGRESS':
    case 'TEMPORARILY UNAVAILABLE':
    case 'MAINTENANCE':
    case 'HIGH':
    case 'URGENT':
      config = {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-[#D97706]',
        pulse: false,
        defaultLabel: normalized === 'PENDING' ? 'Pending Review' : normalized === 'HIGH' ? 'High Urgency' : 'Maintenance',
      };
      break;

    case 'DECLINED':
    case 'CRITICAL':
    case 'ALERT_RECEIVED':
    case 'EMERGENCY':
    case 'INBOUND':
      config = {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-[#DC2626]',
        pulse: normalized === 'ALERT_RECEIVED' || normalized === 'INBOUND' || normalized === 'CRITICAL',
        defaultLabel: normalized === 'DECLINED' ? 'Declined' : normalized === 'ALERT_RECEIVED' ? 'Inbound 1122' : 'Critical',
      };
      break;

    case 'INFORMATION':
    case 'INFO':
    case 'ROUTINE':
    case 'MODERATE':
      config = {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-[#2563EB]',
        pulse: false,
        defaultLabel: 'Information',
      };
      break;

    case 'UNAVAILABLE':
    case 'OUTDATED':
    case 'OFF DUTY':
    case 'OFFLINE':
    default:
      config = {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-[#64748B]',
        pulse: false,
        defaultLabel: normalized === 'OUTDATED' ? 'Outdated' : normalized === 'OFF DUTY' ? 'Off Duty' : 'Unavailable',
      };
      break;
  }

  const displayText = label || config.defaultLabel || status;

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-2 py-0.5 gap-1'
    : 'text-xs px-2.5 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot} ${config.pulse ? 'animate-ping' : ''}`} />
      <span className="truncate">{displayText}</span>
    </span>
  );
}
