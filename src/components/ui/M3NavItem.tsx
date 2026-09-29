import React from 'react';
import { M3Badge } from './M3Badge';

export interface M3NavItemProps {
  label: React.ReactNode;
  icon?: string;
  iconFilled?: boolean;
  leading?: React.ReactNode;
  active?: boolean;
  badge?: string | number;
  trailing?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export const M3NavItem: React.FC<M3NavItemProps> = ({
  label,
  icon,
  iconFilled = false,
  leading,
  active = false,
  badge,
  trailing,
  onClick,
  className = '',
  title,
  disabled = false,
}) => {
  const baseClasses = `group w-full h-10 min-h-[40px] px-4 rounded-full flex items-center justify-between text-sm font-medium transition-colors duration-150 select-none text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
    active
      ? 'bg-m3-primary-container text-m3-on-primary-container'
      : 'text-m3-on-surface-variant hover:bg-m3-on-surface/10 active:bg-m3-on-surface/15 hover:text-m3-on-surface'
  } ${className}`;

  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Leading Slot: Custom Node (e.g. Checkbox) or Standardized 20px Icon */}
        {leading ? (
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {leading}
          </div>
        ) : icon ? (
          <span
            className={`material-symbols-rounded text-[20px] w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
              iconFilled ? 'filled' : ''
            } ${active ? 'text-m3-on-primary-container' : 'text-m3-on-surface-variant group-hover:text-m3-on-surface'}`}
          >
            {icon}
          </span>
        ) : null}

        {/* Text Label with standard 14px font */}
        <span className="truncate flex-1 min-w-0">{label}</span>
      </div>

      {/* Trailing Slot / Counter / Icon */}
      {(trailing || (badge !== undefined && badge !== null)) && (
        <div className="w-5 h-5 min-w-[20px] shrink-0 ml-2 flex items-center justify-center">
          {trailing ? trailing : <M3Badge count={badge!} active={active} />}
        </div>
      )}
    </>
  );

  // Sempre <button> (sem div[role=button] aninhado). `leading` deve ser não-interativo;
  // toggles interativos vão em `trailing` com stopPropagation no caller.
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={baseClasses}
    >
      {content}
    </button>
  );
};
