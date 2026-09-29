import { useRef, useState } from 'react';
import { getApiErrorMessage } from '../lib/errors';
import { productImageThumbnail, uploadProductImage } from '../services/products';
import { IconCamera } from './icons';

interface ProductPhotoFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

// On a phone, `capture` opens the rear camera directly; on a computer it's a
// regular file picker. The photo is uploaded right away and only its URL is
// saved with the product.
export function ProductPhotoField({ value, onChange }: ProductPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      onChange(await uploadProductImage(file));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      // Lets the same photo be picked again after an error.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-steel">Foto</span>
      <div className="flex items-center gap-3">
        {value && (
          <img
            src={productImageThumbnail(value, 240)}
            alt="Foto del producto"
            className="h-24 w-24 rounded-sm border border-line object-cover"
          />
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
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-sm text-rust">{error}</p>}
    </div>
  );
}
