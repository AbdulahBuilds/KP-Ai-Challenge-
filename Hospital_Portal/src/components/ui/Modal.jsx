import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal adhering to DESIGN_SYSTEM.md:
 * - White background
 * - 12px border radius
 * - Clear title and description
 * - Proper confirmation buttons
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-white rounded-xl border border-surface-border shadow-modal w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn`}
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-surface-border flex items-start justify-between">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-typography-primary">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-typography-secondary mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-typography-secondary hover:text-typography-primary p-1.5 rounded-lg hover:bg-surface-main transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Pinned Modal Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-surface-border bg-slate-50/80 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

