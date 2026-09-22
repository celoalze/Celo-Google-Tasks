import React from 'react';

interface M3CheckboxProps {
  checked: boolean;
  onChange: () => void;
  title?: string;
  size?: 'sm' | 'md';
}

export const M3Checkbox: React.FC<M3CheckboxProps> = ({
  checked,
  onChange,
  title,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-sm';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      title={title || (checked ? 'Marcar como não concluída' : 'Marcar como concluída')}
      className={`group relative flex items-center justify-center rounded-full border transition-all duration-200 focus:outline-none ${sizeClasses} ${
        checked
          ? 'bg-m3-primary border-m3-primary text-m3-on-primary shadow-sm'
          : 'border-m3-outline/60 hover:border-m3-primary bg-transparent text-transparent hover:text-m3-outline/40'
      }`}
    >
      <span
        className={`material-symbols-rounded pointer-events-none select-none transition-transform duration-200 ${
          checked ? 'scale-100' : 'scale-0 group-hover:scale-75'
        }`}
        style={{ fontSize: isSm ? '14px' : '16px', fontWeight: 600 }}
      >
        check
      </span>
    </button>
  );
};
