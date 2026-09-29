import React from 'react';

export interface M3MenuProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export const M3Menu: React.FC<M3MenuProps> = ({
  children,
  className = '',
  width = 'w-64',
}) => {
  return (
    <div
      role="menu"
      className={`bg-m3-surface-container-high rounded-m3-sm shadow-m3-3 py-2 z-30 text-xs text-m3-on-surface animate-in fade-in zoom-in-95 duration-150 select-none ${width} ${className}`}
    >
      {children}
    </div>
  );
};

export interface M3MenuItemProps {
  label: string;
  sublabel?: string;
  icon?: string;
  selected?: boolean;
  indent?: boolean;
  trailing?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

export const M3MenuItem: React.FC<M3MenuItemProps> = ({
  label,
  sublabel,
  icon,
  selected,
  indent = false,
  trailing,
  variant = 'default',
  disabled = false,
  onClick,
}) => {
  const isDanger = variant === 'danger';
  const hasLeadingSlot = icon !== undefined || selected !== undefined || indent;

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-m3-on-surface-variant'
          : isDanger
          ? 'text-m3-error hover:bg-m3-error/10 active:bg-m3-error/15 cursor-pointer'
          : 'text-m3-on-surface hover:bg-m3-on-surface/10 active:bg-m3-on-surface/15 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3 truncate min-w-0">
        {hasLeadingSlot && (
          <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
            {selected ? (
              <span className="material-symbols-rounded text-[18px] text-m3-on-surface">
                check
              </span>
            ) : icon ? (
              <span
                className={`material-symbols-rounded text-[18px] ${
                  isDanger ? 'text-m3-error' : 'text-m3-outline'
                }`}
              >
                {icon}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex flex-col truncate min-w-0">
          <span className="truncate text-xs font-normal">{label}</span>
          {sublabel && (
            <span className="text-[0.625rem] text-m3-on-surface-variant mt-0.5 truncate leading-tight">
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {trailing && <div className="flex-shrink-0 ml-2">{trailing}</div>}
    </button>
  );
};

export const M3MenuDivider: React.FC = () => (
  <div className="my-1.5 border-t border-m3-outline-variant/30" />
);

export const M3MenuHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="px-4 py-1.5 text-xs text-m3-on-surface-variant font-normal">
    {title}
  </div>
);
