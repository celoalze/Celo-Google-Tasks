import React from 'react';

export type M3ButtonVariant = 'text' | 'filled' | 'tonal' | 'elevated' | 'danger';
export type M3ButtonSize = 'sm' | 'md' | 'lg';

export type M3ButtonShape = 'pill' | 'rounded';

export interface M3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: M3ButtonVariant;
  size?: M3ButtonSize;
  shape?: M3ButtonShape;
  icon?: React.ReactNode;
  iconPosition?: 'leading' | 'trailing';
}

export const M3Button: React.FC<M3ButtonProps> = ({
  children,
  variant = 'text',
  size = 'md',
  shape = 'pill',
  icon,
  iconPosition = 'leading',
  className = '',
  disabled,
  ...rest
}) => {
  const sizeClasses: Record<M3ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold gap-2',
    lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5',
  };

  const iconSizeClasses: Record<M3ButtonSize, string> = {
    sm: 'text-[16px]',
    md: 'text-[18px]',
    lg: 'text-[22px]',
  };

  const shapeClasses: Record<M3ButtonShape, string> = {
    pill: 'rounded-full',
    rounded: 'rounded-2xl',
  };

  const variantClasses: Record<M3ButtonVariant, string> = {
    text: 'text-m3-primary hover:bg-m3-primary/10 active:bg-m3-primary/20 disabled:text-m3-outline/40 disabled:hover:bg-transparent',
    filled:
      'bg-m3-primary text-m3-on-primary hover:brightness-105 active:brightness-110 shadow-sm disabled:opacity-40 disabled:hover:brightness-100',
    tonal:
      'bg-m3-surface-container-highest text-m3-on-surface hover:bg-m3-surface-bright hover:shadow-md active:bg-m3-outline-variant disabled:opacity-40',
    elevated:
      'bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high shadow-md hover:shadow-lg disabled:opacity-40',
    danger:
      'text-m3-error hover:bg-m3-error/10 active:bg-m3-error/20 disabled:text-m3-error/40 disabled:hover:bg-transparent',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-150 focus:outline-none select-none disabled:cursor-not-allowed ${
        shapeClasses[shape]
      } ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {icon && iconPosition === 'leading' && (
        typeof icon === 'string' ? (
          <span className={`material-symbols-rounded ${iconSizeClasses[size]}`}>{icon}</span>
        ) : (
          <span className="flex items-center justify-center shrink-0">{icon}</span>
        )
      )}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'trailing' && (
        typeof icon === 'string' ? (
          <span className={`material-symbols-rounded ${iconSizeClasses[size]}`}>{icon}</span>
        ) : (
          <span className="flex items-center justify-center shrink-0">{icon}</span>
        )
      )}
    </button>
  );
};
