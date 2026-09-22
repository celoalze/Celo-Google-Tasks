import React from 'react';

export interface M3TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const M3TextField: React.FC<M3TextFieldProps> = ({
  label,
  error,
  className = '',
  id,
  ...rest
}) => {
  return (
    <div className="w-full flex flex-col">
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium text-m3-outline mb-1.5 pl-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-m3-surface-container-highest rounded-t px-3.5 py-3 text-sm text-m3-on-surface placeholder:text-m3-outline border-b-2 transition-colors focus:outline-none ${
          error
            ? 'border-m3-error text-m3-error placeholder:text-m3-error/60'
            : 'border-m3-outline/40 focus:border-m3-primary'
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-[11px] text-m3-error mt-1 pl-1">{error}</span>}
    </div>
  );
};
