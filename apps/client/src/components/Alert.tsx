import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

const variantClasses: Record<AlertVariant, string> = {
  error: 'bg-rust-tint text-rust-2 border-rust-line',
  success: 'bg-ok-tint text-ok border-ok-line',
  info: 'bg-info-tint text-ink border-line',
};

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-sm border px-4 py-3 text-sm ${variantClasses[variant]}`}
    >
      {children}
    </div>
  );
}
