import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatIssueDate,
  IMPORT_STATUS_LABEL,
  IMPORT_STATUS_STYLE,
  type ImportCounters,
} from '../../lib/purchaseImports';
import type { PurchaseImportDetail } from '../../services/purchaseImports';

interface PurchaseImportHeaderProps {
  purchaseImport: PurchaseImportDetail;
  counters: ImportCounters;
  /** Shows the actions menu (apply classification / discard). */
  canEdit: boolean;
  onApplyClassification: () => void;
  onDiscard: () => void;
}

export function PurchaseImportHeader({
  purchaseImport,
  counters,
  canEdit,
  onApplyClassification,
  onDiscard,
}: PurchaseImportHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDraft = purchaseImport.status === 'draft';

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const runAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <div className="flex flex-col gap-3">
      <Link to="/compras" className="min-h-6 self-start text-sm font-medium text-steel hover:underline">
        Volver a Compras
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {purchaseImport.invoiceNumber}
          </h1>
          <p className="text-sm text-steel">{purchaseImport.supplier.name}</p>
          <p className="text-xs text-fog">
            NIT {purchaseImport.supplier.nit} · {formatIssueDate(purchaseImport.issueDate)} ·{' '}
            {purchaseImport.lineCount} {purchaseImport.lineCount === 1 ? 'línea' : 'líneas'}
          </p>
        </div>

        <div ref={menuRef} className="relative flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${IMPORT_STATUS_STYLE[purchaseImport.status]}`}
          >
            {IMPORT_STATUS_LABEL[purchaseImport.status]}
          </span>
          {isDraft && canEdit && (
            <>
              <button
                type="button"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((open) => !open)}
                className="min-h-11 border border-line-2 bg-paper px-3 text-sm font-medium text-ink hover:bg-mist"
              >
                Acciones ▾
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 flex w-64 flex-col rounded border border-line bg-paper py-1 shadow-lg">
                  <button
                    type="button"
                    disabled={counters.newLines === 0}
                    onClick={() => runAction(onApplyClassification)}
                    className="min-h-11 px-4 text-left text-sm text-ink hover:bg-mist disabled:text-fog"
                  >
                    Aplicar clasificación a las nuevas
                  </button>
                  <button
                    type="button"
                    onClick={() => runAction(onDiscard)}
                    className="min-h-11 px-4 text-left text-sm font-medium text-rust hover:bg-mist"
                  >
                    Descartar borrador
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: 'Nuevas', value: counters.newLines },
          { label: 'Existentes', value: counters.existingLines },
          { label: 'Con pendientes', value: counters.pendingLines },
        ].map(({ label, value }) => (
          <div key={label} className="rounded border border-line bg-paper px-3 py-2">
            <dd className="font-mono text-lg font-semibold text-ink">{value}</dd>
            <dt className="text-xs text-fog">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
