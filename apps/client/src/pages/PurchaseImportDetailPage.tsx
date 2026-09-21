import { Link, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { PurchaseImportReview } from '../components/purchase-imports/PurchaseImportReview';
import { Spinner } from '../components/Spinner';
import { usePurchaseImport } from '../hooks/usePurchaseImports';
import { getApiErrorMessage } from '../lib/errors';

export function PurchaseImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const importQuery = usePurchaseImport(id);

  if (importQuery.isPending) {
    return <Spinner label="Cargando compra…" />;
  }

  if (importQuery.isError) {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="error">{getApiErrorMessage(importQuery.error)}</Alert>
        <Link to="/compras" className="text-sm font-medium text-steel hover:underline">
          Volver a Compras
        </Link>
      </div>
    );
  }

  return (
    <PurchaseImportReview
      key={importQuery.data.id}
      purchaseImport={importQuery.data}
      onRefetch={() => void importQuery.refetch()}
    />
  );
}
