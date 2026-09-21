import type { LineStatus } from '../../services/purchaseImports';

const STATUS_LABEL: Record<LineStatus, string> = {
  existing: 'Existe',
  manual: 'Enlazado',
  new: 'Nuevo',
};

const STATUS_STYLE: Record<LineStatus, string> = {
  existing: 'bg-ok-tint text-ok',
  manual: 'bg-indigo-tint text-indigo',
  new: 'bg-carbon-tint text-carbon',
};

interface LineStatusChipProps {
  status: LineStatus;
  /** On a confirmed import the chip reports what confirming did instead. */
  outcome?: 'created' | 'restocked';
}

export function LineStatusChip({ status, outcome }: LineStatusChipProps) {
  const label = outcome ? (outcome === 'created' ? 'Creado' : 'Existente') : STATUS_LABEL[status];
  const style = outcome
    ? outcome === 'created'
      ? STATUS_STYLE.new
      : STATUS_STYLE.existing
    : STATUS_STYLE[status];

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>
  );
}
