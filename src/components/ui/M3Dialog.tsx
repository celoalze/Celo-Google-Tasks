import React, { useEffect } from 'react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-[1px] animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`bg-m3-surface-container-high rounded-[28px] w-full ${maxWidth} p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative text-m3-on-surface`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 className="text-base font-medium text-m3-on-surface tracking-tight">
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
          <p className="text-xs text-m3-outline leading-relaxed mb-6">
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
