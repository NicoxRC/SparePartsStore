import { useState } from 'react';

interface ConfirmBarProps {
  readyToConfirm: boolean;
  pendingLines: number;
  onConfirm: () => void;
  /** Tapped while not ready — the page reveals the first pending line. */
  onBlockedTap: () => void;
}

/** Sits above the mobile bottom nav (h-14). Confirmar stays tappable while blocked so it can explain why. */
export function ConfirmBar({ readyToConfirm, pendingLines, onConfirm, onBlockedTap }: ConfirmBarProps) {
  const [wasTapped, setWasTapped] = useState(false);

  const handleClick = () => {
    if (readyToConfirm) {
      onConfirm();
      return;
    }
    setWasTapped(true);
    onBlockedTap();
  };

  const pendingText =
    pendingLines > 0
      ? `${pendingLines} ${pendingLines === 1 ? 'línea pendiente' : 'líneas pendientes'}`
      : 'Revisa la compra';

  return (
    <div className="fixed inset-x-0 bottom-14 z-10 border-t border-line bg-paper px-4 py-3 lg:bottom-0 lg:left-60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-steel" aria-live="polite">
          {readyToConfirm
            ? 'Todo listo para confirmar.'
            : wasTapped
              ? `Completa lo marcado: ${pendingText}.`
              : pendingText}
        </p>
        <button
          type="button"
          aria-disabled={!readyToConfirm}
          onClick={handleClick}
          className={`min-h-12 shrink-0 px-6 text-base font-semibold text-paper transition-colors sm:text-sm ${
            readyToConfirm ? 'bg-ink hover:bg-ink-2 active:bg-ink-3' : 'bg-ink/40'
          }`}
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
