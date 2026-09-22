import React from 'react';

export interface M3IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  title?: string;
  filled?: boolean;
  active?: boolean;
  colorClass?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const M3IconButton: React.FC<M3IconButtonProps> = ({
  icon,
  onClick,
  title,
  filled = false,
  active = false,
  colorClass = 'text-m3-on-surface-variant hover:text-m3-on-surface',
  size = 'md',
  className = '',
  disabled,
  ...rest
}) => {
  // M3 Standard Icon Button Sizes: strictly symmetric 1:1 circle (rounded-full)
  const sizeMap: Record<'xs' | 'sm' | 'md' | 'lg', { btn: string; icon: string }> = {
    xs: { btn: 'w-6 h-6 min-w-[24px] min-h-[24px]', icon: 'text-[16px]' },
    sm: { btn: 'w-7 h-7 min-w-[28px] min-h-[28px]', icon: 'text-[18px]' },
    md: { btn: 'w-8 h-8 min-w-[32px] min-h-[32px]', icon: 'text-[20px]' },
    lg: { btn: 'w-10 h-10 min-w-[40px] min-h-[40px]', icon: 'text-[24px]' },
  };

  const { btn, icon: iconSize } = sizeMap[size];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 transition-colors duration-150 hover:bg-m3-on-surface/10 active:bg-m3-on-surface/15 focus:outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed ${btn} ${
        active ? 'text-m3-primary' : colorClass
      } ${className}`}
      {...rest}
    >
      <span className={`material-symbols-rounded ${iconSize} leading-none flex items-center justify-center ${filled || active ? 'filled' : ''}`}>
        {icon}
      </span>
    </button>
  );
};
