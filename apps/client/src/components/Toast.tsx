import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
  /** Optional link shown next to the message (e.g. "Ver/imprimir PDF") —
   * disables auto-dismiss so there's time to act on it. */
  action?: {
    label: string;
    href: string;
  };
}

export function Toast({ message, onDismiss, duration = 4000, action }: ToastProps) {
  useEffect(() => {
    if (action) return;
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [message, duration, onDismiss, action]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 border border-ok-line bg-ok-tint px-4 py-3 text-sm text-ok shadow-lg lg:bottom-6"
    >
      <span>{message}</span>
      <div className="flex shrink-0 items-center gap-3">
        {action && (
          <a
            href={action.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline hover:opacity-70"
          >
            {action.label}
          </a>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          className="text-ok hover:opacity-70"
        >
          ×
        </button>
      </div>
    </div>
  );
}
