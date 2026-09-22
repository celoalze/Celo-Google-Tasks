import React from 'react';

export interface M3BadgeProps {
  count: number | string;
  active?: boolean;
  highlight?: boolean;
  className?: string;
}

export const M3Badge: React.FC<M3BadgeProps> = ({
  count,
  active = false,
  highlight = false,
  className = '',
}) => {
  if (
    count === undefined ||
    count === null ||
    count === '' ||
    count === 0 ||
    count === '0' ||
    (typeof count === 'number' && count < 0)
  ) {
    return null;
  }

  const str = String(count);
  const isSingle = str.length <= 1;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-[11px] font-medium leading-none shrink-0 select-none transition-colors ${
        isSingle ? 'w-5 h-5 min-w-[20px]' : 'min-w-[20px] h-5 px-1.5'
      } ${
        active
          ? 'bg-m3-primary text-m3-on-primary'
          : highlight
          ? 'bg-m3-primary/20 text-m3-primary'
          : 'bg-m3-surface-container-highest text-m3-on-surface-variant group-hover:text-m3-on-surface'
      } ${className}`}
    >
      {count}
    </span>
  );
};

