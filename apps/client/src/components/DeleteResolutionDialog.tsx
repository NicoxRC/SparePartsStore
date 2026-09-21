import { createPortal } from 'react-dom';
import { Alert } from './Alert';
import { Button } from './Button';
import { useDeleteResolution } from '../hooks/useResolutions';
import { getApiErrorMessage } from '../lib/errors';
import type { ResolutionResponse } from '../services/resolutions';

interface DeleteResolutionDialogProps {
  resolution: ResolutionResponse;
  onClose: () => void;
}

export function DeleteResolutionDialog({ resolution, onClose }: DeleteResolutionDialogProps) {
  const deleteMutation = useDeleteResolution();

  const handleConfirm = async () => {
    await deleteMutation.mutateAsync(resolution.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded bg-paper p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">¿Eliminar esta resolución?</h2>
        <p className="mt-2 text-sm text-steel">
          <span className="font-mono font-medium">
            {resolution.prefix} · {resolution.resolutionNumber}
          </span>{' '}
          ({resolution.rangeStart}–{resolution.rangeEnd}). Se quita solo de esta aplicación: en
          Dataico la numeración queda como está. Si era la vigente, vuelve a serlo la anterior.
        </p>

        {deleteMutation.isError && (
          <Alert variant="error">{getApiErrorMessage(deleteMutation.error)}</Alert>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
