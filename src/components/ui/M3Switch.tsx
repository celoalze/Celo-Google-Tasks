import React from 'react';

export interface M3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export const M3Switch: React.FC<M3SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-m3-primary' : 'bg-m3-surface-container-highest'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-flex items-center justify-center rounded-full shadow-sm transition-all duration-200 ease-in-out ${
          checked
            ? 'h-5 w-5 translate-x-5 bg-m3-on-primary text-m3-primary'
            : 'h-4 w-4 translate-x-0.5 bg-m3-outline text-transparent'
        }`}
      >
        {checked && (
          <span className="material-symbols-rounded text-[14px] font-bold">check</span>
        )}
      </span>
    </button>
  );
};
