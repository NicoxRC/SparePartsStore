import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

const variantClasses: Record<AlertVariant, string> = {
  error: 'bg-[#FBEAE7] text-[#A93C30] border-[#F0CFC8]',
  success: 'bg-[#E9F3EC] text-[#2F6B45] border-[#CFE6D7]',
  info: 'bg-[#EEF1F7] text-[#1E2A4A] border-[#D8DCE6]',
};

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]}`}
    >
      {children}
    </div>
  );
}
