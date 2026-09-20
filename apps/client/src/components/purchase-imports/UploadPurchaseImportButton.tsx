import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { useUploadPurchaseImport } from '../../hooks/usePurchaseImports';
import { getApiErrorMessage, getApiErrorStatus } from '../../lib/errors';
import { getDuplicateImportInfo } from '../../lib/purchaseImports';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const XML_MIME_TYPES = ['text/xml', 'application/xml'];

/** Fast client-side reject; the server decides whether the XML is really a supplier invoice. */
function validateFile(file: File): string | null {
  const looksLikeXml =
    file.name.toLowerCase().endsWith('.xml') || XML_MIME_TYPES.includes(file.type);
  if (!looksLikeXml) return 'El archivo debe ser un .xml de la factura electrónica.';
  if (file.size > MAX_FILE_BYTES) return 'El archivo supera el máximo de 5 MB.';
  return null;
}

export function UploadPurchaseImportButton() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadMutation = useUploadPurchaseImport();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again (after a discard, say) still fires onChange.
    event.target.value = '';
    if (!file) return;

    const error = validateFile(file);
    setFileError(error);
    if (error) return;

    uploadMutation.mutate(file, {
      onSuccess: (detail) => navigate(`/compras/${detail.id}`),
    });
  };

  const duplicate = uploadMutation.isError ? getDuplicateImportInfo(uploadMutation.error) : null;
  const uploadError = uploadMutation.isError && !duplicate ? uploadMutation.error : null;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        className="sm:w-auto sm:self-start sm:px-6"
        isLoading={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        Cargar factura de proveedor (XML)
      </Button>

      {fileError && <Alert variant="error">{fileError}</Alert>}

      {duplicate && (
        <Alert variant="info">
          <p className="font-medium">Esta factura ya fue cargada.</p>
          <Link
            to={`/compras/${duplicate.existingImportId}`}
            className="mt-1 inline-block min-h-6 font-medium underline"
          >
            {duplicate.existingStatus === 'confirmed'
              ? 'Ver la compra confirmada'
              : 'Ver el borrador'}
          </Link>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="error">
          {getApiErrorStatus(uploadError) === 413
            ? 'El archivo supera el máximo de 5 MB.'
            : getApiErrorMessage(uploadError)}
        </Alert>
      )}
    </div>
  );
}
