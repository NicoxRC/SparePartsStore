import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, id, className = '', ...rest }, ref) {
    const inputId = id ?? rest.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-steel">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`min-h-12 w-full rounded-sm border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink sm:min-h-11 sm:py-2.5 sm:text-sm ${
            error ? 'border-rust' : 'border-line'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-rust">
            {error}
          </p>
        )}
      </div>
    );
  },
);
