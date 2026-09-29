import React, { useEffect, useId, useRef } from 'react';
import { M3IconButton } from './M3IconButton';

export interface M3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
}

export const M3Dialog: React.FC<M3DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  maxWidth = 'max-w-[340px]',
  showCloseButton = false,
}) => {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    if (isOpen) {
      prevFocus.current = document.activeElement;
      document.addEventListener('keydown', handleKeyDown);
      // Autofocus no dialog
      const t = setTimeout(() => dialogRef.current?.focus(), 0);
      return () => {
        clearTimeout(t);
        document.removeEventListener('keydown', handleKeyDown);
        (prevFocus.current as HTMLElement | null)?.focus?.();
      };
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-m3-scrim/60 z-50 flex items-center justify-center p-4 backdrop-blur-[1px] animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-m3-surface-container-high rounded-m3-3xl w-full ${maxWidth} p-6 shadow-m3-3 animate-in zoom-in-95 duration-150 relative text-m3-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 id={titleId} className="text-base font-medium text-m3-on-surface tracking-tight">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <M3IconButton
                icon="close"
                size="md"
                title="Fechar"
                onClick={onClose}
                className="ml-auto"
              />
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p id={descId} className="text-xs text-m3-on-surface-variant leading-relaxed mb-6">
            {description}
          </p>
        )}

        {/* Body Content */}
        {children && <div className="space-y-4">{children}</div>}

        {/* Actions Footer */}
        {actions && (
          <div className="flex items-center justify-end gap-2 mt-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
