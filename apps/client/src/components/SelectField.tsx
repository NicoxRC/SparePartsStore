import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, id, className = '', children, ...rest }, ref) {
    const selectId = id ?? rest.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-steel">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`min-h-12 w-full border bg-paper px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink sm:min-h-11 sm:py-2.5 sm:text-sm ${
            error ? 'border-rust' : 'border-line-2'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...rest}
        >
          {children}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-rust">
            {error}
          </p>
        )}
      </div>
    );
  },
);
