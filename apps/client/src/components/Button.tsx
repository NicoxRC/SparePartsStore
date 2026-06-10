import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#1E2A4A] text-white hover:bg-[#27365E] active:bg-[#16203A] disabled:bg-[#1E2A4A]/40',
  secondary:
    'bg-white text-[#1E2A4A] border border-[#D8DCE6] hover:bg-[#F0F2F6] active:bg-[#E4E8EF] disabled:bg-gray-50 disabled:text-gray-400',
  danger:
    'bg-[#C2483A] text-white hover:bg-[#A93C30] active:bg-[#8F3327] disabled:bg-[#C2483A]/40',
  ghost:
    'bg-transparent text-[#3F4654] hover:bg-[#1E2A4A]/5 active:bg-[#1E2A4A]/10 disabled:text-gray-300',
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
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm ${variantClasses[variant]} ${className}`}
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
