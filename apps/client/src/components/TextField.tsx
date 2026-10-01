import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Rendered inside the input's right edge, e.g. PasswordField's eye toggle. */
  endAdornment?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, endAdornment, id, className = '', ...rest }, ref) {
    const inputId = id ?? rest.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-steel">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`min-h-12 w-full border bg-paper px-4 py-3 text-base text-ink placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-ink/30 focus:border-ink sm:min-h-11 sm:py-2.5 sm:text-sm ${
              error ? 'border-rust' : 'border-line-2'
            } ${endAdornment ? 'pr-12' : ''} ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">
              {endAdornment}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-rust">
            {error}
          </p>
        )}
      </div>
    );
  },
);
