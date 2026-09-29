import React, { memo } from 'react';
import { useI18nStore } from '../../store/useI18nStore';
import { cn } from '../../utils/cn';

interface M3CheckboxProps {
  checked: boolean;
  onChange: () => void;
  title?: string;
  size?: 'sm' | 'md';
}

export const M3Checkbox: React.FC<M3CheckboxProps> = memo(({ checked, onChange, title, size = 'md' }) => {
  const t = useI18nStore((state) => state.t);
  const isSm = size === 'sm';

  const tooltipText =
    title ||
    (checked
      ? t('taskCard.markIncomplete') || 'Marcar como não concluída'
      : t('taskCard.markCompleted') || 'Marcar como concluída');

  return (
    <span className="relative group/checkbox inline-flex items-center justify-center select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange();
        }}
        role="checkbox"
        aria-checked={checked}
        aria-label={tooltipText}
        title={tooltipText}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none select-none hover:bg-m3-on-surface/10 active:bg-m3-on-surface/15',
          isSm ? 'w-6 h-6' : 'w-7 h-7'
        )}
      >
        {checked ? (
          /* Completed: Clean Google blue checkmark (no circle outline, exactly matching Google Tasks Web) */
          <span
            aria-hidden
            className={cn(
              'material-symbols-rounded filled text-m3-primary select-none pointer-events-none transition-transform duration-150',
              isSm ? 'text-[1rem]' : 'text-[1.25rem]'
            )}
          >
            check
          </span>
        ) : (
          /* Uncompleted: Subtle circle ring with blue checkmark appearing on hover/focus */
          <span
            aria-hidden
            className={cn(
              'rounded-full border-[1.75px] border-m3-outline-variant group-hover/checkbox:border-m3-on-surface-variant group-focus-within/checkbox:border-m3-on-surface-variant flex items-center justify-center transition-colors duration-150',
              isSm ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'material-symbols-rounded filled text-m3-primary opacity-0 group-hover/checkbox:opacity-100 group-focus-within/checkbox:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 select-none pointer-events-none',
                isSm ? 'text-[0.75rem]' : 'text-[0.875rem]'
              )}
            >
              check
            </span>
          </span>
        )}
      </button>

      {/* Floating Google Tasks Web Tooltip */}
      <span
        role="tooltip"
        className="absolute top-full mt-1.5 left-0 z-50 pointer-events-none opacity-0 group-hover/checkbox:opacity-100 group-focus-within/checkbox:opacity-100 focus-within:opacity-100 transition-opacity duration-150 shadow-m3-2 rounded-m3-xs px-2 py-1 bg-m3-inverse-surface text-m3-inverse-on-surface text-[0.6875rem] font-medium whitespace-nowrap"
      >
        {tooltipText}
      </span>
    </span>
  );
});

M3Checkbox.displayName = 'M3Checkbox';
