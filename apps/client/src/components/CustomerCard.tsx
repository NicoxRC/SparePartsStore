import { Link } from 'react-router-dom';
import type { CustomerResponse } from '../services/customers';
import { Button } from './Button';

interface CustomerCardProps {
  customer: CustomerResponse;
  canDelete: boolean;
  onDelete: (customer: CustomerResponse) => void;
  isDeleting: boolean;
}

function customerLabel(customer: CustomerResponse): string {
  const personName = [customer.firstName, customer.familyName].filter(Boolean).join(' ');
  return customer.companyName || personName || customer.identification;
}

export function CustomerCard({ customer, canDelete, onDelete, isDeleting }: CustomerCardProps) {
  return (
    <div className="flex h-full flex-col rounded border border-line bg-paper p-4 transition-colors hover:border-fog">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {customerLabel(customer)}
          </p>
          <p className="truncate text-sm text-steel">{customer.email}</p>
        </div>
        <span className="shrink-0 rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide text-steel">
          {customer.partyType === 'PERSONA_JURIDICA' ? 'Jurídica' : 'Natural'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-steel">
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Identificación</dt>
          <dd className="truncate">
            {customer.identificationType} {customer.identification}
            {customer.identificationDv ? `-${customer.identificationDv}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-fog">Teléfono</dt>
          <dd className="truncate">{customer.phone || '—'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 sm:mt-auto sm:pt-4">
        <Link to={`/customers/${customer.id}/edit`} className="flex-1">
          <Button variant="secondary" type="button" className="w-full">
            Editar
          </Button>
        </Link>
        <Button
          variant="danger"
          type="button"
          className="flex-1"
          disabled={!canDelete}
          isLoading={isDeleting}
          onClick={() => onDelete(customer)}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
