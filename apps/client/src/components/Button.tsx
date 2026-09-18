import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:bg-ink-2 active:bg-ink-3 disabled:bg-ink/40',
  secondary:
    'bg-paper text-ink border border-line-2 hover:bg-mist active:bg-line disabled:bg-paper disabled:text-fog',
  danger:
    'bg-rust text-paper hover:bg-rust-2 active:bg-rust-3 disabled:bg-rust/40',
  ghost:
    'bg-transparent text-steel hover:bg-ink/5 active:bg-ink/10 disabled:text-fog',
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
      className={`flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm ${variantClasses[variant]} ${className}`}
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
