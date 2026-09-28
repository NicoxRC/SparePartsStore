import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { FilePickerButton } from './FilePickerButton';
import {
  useDownloadPurchaseImportTemplate,
  useUploadPurchaseImport,
  useUploadPurchaseImportExcel,
} from '../../hooks/usePurchaseImports';
import { getApiErrorMessage, getApiErrorStatus } from '../../lib/errors';
import {
  getDuplicateImportInfo,
  validateExcelFile,
  validateXmlFile,
} from '../../lib/purchaseImports';
import type { PurchaseImportDetail } from '../../services/purchaseImports';

type UploadKind = 'xml' | 'excel';

/**
 * Two ways to start a draft: the supplier's XML, or — when there is no XML —
 * the Excel template. Both end on the same review screen.
 */
export function UploadPurchaseImportButton() {
  const navigate = useNavigate();
  const xmlMutation = useUploadPurchaseImport();
  const excelMutation = useUploadPurchaseImportExcel();
  const templateMutation = useDownloadPurchaseImportTemplate();
  const [lastKind, setLastKind] = useState<UploadKind>('xml');
  const [fileError, setFileError] = useState<string | null>(null);

  const mutations = { xml: xmlMutation, excel: excelMutation };
  const validators = { xml: validateXmlFile, excel: validateExcelFile };

  const handleFile = (kind: UploadKind, file: File) => {
    setLastKind(kind);
    const error = validators[kind](file);
    setFileError(error);
    if (error) return;

    mutations[kind].mutate(file, {
      onSuccess: (detail: PurchaseImportDetail) => navigate(`/compras/${detail.id}`),
    });
  };

  const failed = mutations[lastKind];
  const duplicate = failed.isError ? getDuplicateImportInfo(failed.error) : null;
  const uploadError = failed.isError && !duplicate ? failed.error : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <FilePickerButton
          label="Cargar factura de proveedor (XML)"
          accept=".xml,text/xml,application/xml"
          isLoading={xmlMutation.isPending}
          onFile={(file) => handleFile('xml', file)}
        />
        <FilePickerButton
          label="Cargar plantilla de Excel"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          variant="secondary"
          isLoading={excelMutation.isPending}
          onFile={(file) => handleFile('excel', file)}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="sm:w-auto sm:self-start"
        isLoading={templateMutation.isPending}
        onClick={() => templateMutation.mutate()}
      >
        ¿Sin XML? Descargar plantilla de Excel
      </Button>
      {templateMutation.isError && (
        <Alert variant="error">No se pudo descargar la plantilla. Intenta de nuevo.</Alert>
      )}

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
