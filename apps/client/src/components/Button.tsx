import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-300',
};

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
