import { Link } from 'react-router-dom';
import { formatIssueDate, IMPORT_STATUS_LABEL, IMPORT_STATUS_STYLE } from '../../lib/purchaseImports';
import type { PurchaseImportSummary } from '../../services/purchaseImports';

interface PurchaseImportRowProps {
  purchaseImport: PurchaseImportSummary;
  /** Shown when the row isn't already under its supplier's heading. */
  showSupplier: boolean;
}

export function PurchaseImportRow({ purchaseImport, showSupplier }: PurchaseImportRowProps) {
  return (
    <Link
      to={`/compras/${purchaseImport.id}`}
      className="flex min-h-14 flex-col gap-1.5 px-4 py-3 hover:bg-mist"
    >
      <p className="truncate text-sm text-ink">
        <span className="font-mono font-medium">{purchaseImport.invoiceNumber}</span>
        {showSupplier && ` — ${purchaseImport.supplier.name}`}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMPORT_STATUS_STYLE[purchaseImport.status]}`}
        >
          {IMPORT_STATUS_LABEL[purchaseImport.status]}
        </span>
        {purchaseImport.source === 'excel' && (
          <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-steel">
            Excel
          </span>
        )}
        <span className="text-xs text-fog">{formatIssueDate(purchaseImport.issueDate)}</span>
        <span className="text-xs text-fog">
          {purchaseImport.lineCount} {purchaseImport.lineCount === 1 ? 'línea' : 'líneas'}
        </span>
        {purchaseImport.createdByName && (
          <span className="text-xs text-fog">Cargó {purchaseImport.createdByName}</span>
        )}
      </div>
    </Link>
  );
}
