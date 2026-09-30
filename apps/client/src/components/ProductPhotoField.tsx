import { useRef, useState } from 'react';
import { getApiErrorMessage } from '../lib/errors';
import { productImageThumbnail, uploadProductImage } from '../services/products';
import { IconCamera } from './icons';
import { ImageCropDialog } from './ImageCropDialog';
import { ProductImageViewer } from './ProductImageViewer';

interface ProductPhotoFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

// On a phone, `capture` opens the rear camera directly; on a computer it's a
// regular file picker. The photo is cropped, then uploaded right away and only its URL is
// saved with the product.
export function ProductPhotoField({ value, onChange }: ProductPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const pickFile = (file: File | undefined) => {
    if (file) setFileToCrop(file);
    // Lets the same photo be picked again.
    if (inputRef.current) inputRef.current.value = '';
  };

  const upload = async (file: File) => {
    setFileToCrop(null);
    setIsUploading(true);
    setError(null);
    try {
      onChange(await uploadProductImage(file));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-steel">Foto</span>
      <div className="flex items-center gap-3">
        {value && (
          <button
            type="button"
            onClick={() => setIsViewerOpen(true)}
            aria-label="Ver foto en grande"
          >
            <img
              src={productImageThumbnail(value, 240)}
              alt="Foto del producto"
              className="h-24 w-24 rounded-sm border border-line object-cover"
            />
          </button>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex min-h-12 items-center justify-center gap-2 rounded-sm border border-line bg-paper px-4 text-sm text-steel hover:bg-canvas disabled:opacity-60 sm:min-h-11"
          >
            <IconCamera className="h-5 w-5" />
            {isUploading ? 'Subiendo…' : value ? 'Cambiar foto' : 'Tomar foto'}
          </button>
          {value && !isUploading && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="self-start text-sm text-rust underline underline-offset-4"
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
      {error && <p className="text-sm text-rust">{error}</p>}
      {fileToCrop && (
        <ImageCropDialog
          file={fileToCrop}
          onConfirm={(cropped) => void upload(cropped)}
          onCancel={() => setFileToCrop(null)}
        />
      )}
      {isViewerOpen && value && (
        <ProductImageViewer
          imageUrl={value}
          alt="Foto del producto"
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
}
