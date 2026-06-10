interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = 'h-6 w-6', label = 'Cargando…' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500">
      <span
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-[#1E2A4A] ${className}`}
        role="status"
        aria-label={label}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
