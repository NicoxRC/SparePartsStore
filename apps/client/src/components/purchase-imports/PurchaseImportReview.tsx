import { useState } from 'react';
import { Alert } from '../Alert';
import { ApplyClassificationDialog } from './ApplyClassificationDialog';
import { ConfirmBar } from './ConfirmBar';
import { ConfirmPurchaseImportDialog } from './ConfirmPurchaseImportDialog';
import { ConfirmResult } from './ConfirmResult';
import { DiscardPurchaseImportDialog } from './DiscardPurchaseImportDialog';
import { LineFilterChips } from './LineFilterChips';
import { PurchaseImportHeader } from './PurchaseImportHeader';
import { PurchaseImportLineCard } from './PurchaseImportLineCard';
import { PurchaseImportLineReadOnly } from './PurchaseImportLineReadOnly';
import { usePermissions } from '../../hooks/usePermissions';
import {
  countLines,
  matchesLineFilter,
  scrollToLine,
  type LineFilter,
} from '../../lib/purchaseImports';
import type {
  ConfirmProblem,
  ConfirmPurchaseImportResponse,
  PurchaseImportDetail,
} from '../../services/purchaseImports';

interface PurchaseImportReviewProps {
  purchaseImport: PurchaseImportDetail;
  /** Re-reads the import — after a refused confirm the server may know of issues the cache doesn't. */
  onRefetch: () => void;
}

export function PurchaseImportReview({ purchaseImport, onRefetch }: PurchaseImportReviewProps) {
  const { has } = usePermissions();
  const isDraft = purchaseImport.status === 'draft';
  const canEdit = isDraft && has('purchase_imports.create');
  const canConfirm = isDraft && has('purchase_imports.confirm');

  const [lineFilter, setLineFilter] = useState<LineFilter>('all');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmPurchaseImportResponse | null>(null);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [refusedMessage, setRefusedMessage] = useState<string | null>(null);

  const { items } = purchaseImport;
  const counters = countLines(items);
  const visibleItems = items.filter((item) => matchesLineFilter(item, lineFilter));

  const revealLine = (itemId: string) => {
    // Wait a frame so the card exists after the filter change.
    requestAnimationFrame(() => scrollToLine(itemId));
  };

  const handleBlockedTap = () => {
    const first = items.find((item) => item.issues.length > 0);
    if (!first) return;
    setLineFilter('pending');
    revealLine(first.id);
  };

  const handleInvalid = (problems: ConfirmProblem[]) => {
    const ids = problems.flatMap((problem) => (problem.itemId ? [problem.itemId] : []));
    setIsConfirmOpen(false);
    setProblemIds(ids);
    setRefusedMessage(
      ids.length > 0
        ? `La compra tiene ${ids.length} ${ids.length === 1 ? 'línea pendiente' : 'líneas pendientes'}. Las marcamos en rojo.`
        : 'La compra no tiene líneas para confirmar.',
    );
    setLineFilter('all');
    onRefetch();
    if (ids.length > 0) revealLine(ids[0]);
  };

  const handleConfirmDone = (result: ConfirmPurchaseImportResponse) => {
    setIsConfirmOpen(false);
    setConfirmResult(result);
  };

  return (
    <div className={`mx-auto flex w-full max-w-3xl flex-col gap-4 ${canConfirm ? 'pb-24' : ''}`}>
      <PurchaseImportHeader
        purchaseImport={purchaseImport}
        counters={counters}
        canEdit={canEdit}
        onApplyClassification={() => setIsClassifyOpen(true)}
        onDiscard={() => setIsDiscardOpen(true)}
      />

      {confirmResult && (
        <Alert variant="success">
          <ConfirmResult result={confirmResult} />
        </Alert>
      )}
      {purchaseImport.status === 'confirmed' && !confirmResult && (
        <Alert variant="success">
          Compra confirmada
          {purchaseImport.confirmedAt &&
            ` el ${new Date(purchaseImport.confirmedAt).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}`}
          . Ya no se puede editar.
        </Alert>
      )}
      {purchaseImport.status === 'discarded' && (
        <Alert variant="info">
          Borrador descartado: no se creó ningún producto ni se movió stock.
        </Alert>
      )}
      {refusedMessage && isDraft && <Alert variant="error">{refusedMessage}</Alert>}

      {items.length === 0 ? (
        <Alert variant="info">Esta factura no tiene líneas.</Alert>
      ) : (
        <>
          <LineFilterChips
            value={lineFilter}
            counters={counters}
            totalLines={items.length}
            onChange={setLineFilter}
          />
          {visibleItems.length === 0 && (
            <Alert variant="info">No hay líneas para este filtro.</Alert>
          )}
          <div className="flex flex-col gap-3">
            {visibleItems.map((item) =>
              canEdit ? (
                <PurchaseImportLineCard
                  key={item.id}
                  importId={purchaseImport.id}
                  item={item}
                  isHighlighted={problemIds.includes(item.id) && item.issues.length > 0}
                />
              ) : (
                <PurchaseImportLineReadOnly
                  key={item.id}
                  item={item}
                  isConfirmed={purchaseImport.status === 'confirmed'}
                  isHighlighted={problemIds.includes(item.id) && item.issues.length > 0}
                />
              ),
            )}
          </div>
        </>
      )}

      {canConfirm && (
        <ConfirmBar
          readyToConfirm={purchaseImport.readyToConfirm}
          pendingLines={counters.pendingLines}
          onConfirm={() => setIsConfirmOpen(true)}
          onBlockedTap={handleBlockedTap}
        />
      )}

      {isConfirmOpen && (
        <ConfirmPurchaseImportDialog
          importId={purchaseImport.id}
          items={items}
          onInvalid={handleInvalid}
          onDone={handleConfirmDone}
          onClose={() => setIsConfirmOpen(false)}
        />
      )}
      {isClassifyOpen && (
        <ApplyClassificationDialog
          importId={purchaseImport.id}
          newLineCount={counters.newLines}
          onClose={() => setIsClassifyOpen(false)}
        />
      )}
      {isDiscardOpen && (
        <DiscardPurchaseImportDialog
          importId={purchaseImport.id}
          onClose={() => setIsDiscardOpen(false)}
          onDiscarded={() => setIsDiscardOpen(false)}
        />
      )}
    </div>
  );
}
