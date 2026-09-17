import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

export function Toast({ message, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [message, duration, onDismiss]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-sm border border-ok-line bg-ok-tint px-4 py-3 text-sm text-ok shadow-lg lg:bottom-6"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 text-ok hover:opacity-70"
      >
        ×
      </button>
    </div>
  );
}
