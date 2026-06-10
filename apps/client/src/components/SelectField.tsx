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
        <label htmlFor={selectId} className="text-sm font-medium text-[#3F4654]">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`min-h-12 w-full rounded-lg border bg-white px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/30 focus:border-[#1E2A4A] sm:min-h-11 sm:py-2.5 sm:text-sm ${
            error ? 'border-[#C2483A]' : 'border-[#D8DCE6]'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...rest}
        >
          {children}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-[#C2483A]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
