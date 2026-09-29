import React, { useId } from 'react';
import { cn } from '../../utils/cn';

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
  const autoId = useId();
  const inputId = id || `m3tf-${autoId}`;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="w-full flex flex-col">
      {label && (
        <label htmlFor={inputId} className="text-[0.6875rem] font-medium text-m3-on-surface-variant mb-1.5 pl-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cn(
          'w-full bg-m3-surface-container-highest rounded-m3-md px-3.5 py-3 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/70 border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary focus-visible:outline-none',
          error
            ? 'border-m3-error text-m3-error placeholder:text-m3-error/60'
            : 'border-m3-outline-variant focus:border-m3-primary',
          className
        )}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className="text-[0.6875rem] text-m3-error mt-1 pl-1">
          {error}
        </span>
      )}
    </div>
  );
};
