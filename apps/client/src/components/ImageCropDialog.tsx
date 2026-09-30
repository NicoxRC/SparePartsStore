import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropDialogProps {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}

// Longest side of the saved photo: plenty for a zoomed-in view, and far
// lighter to upload than a raw phone photo.
const MAX_SIDE = 1600;

const FULL_IMAGE: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 };

// Free crop right after taking the photo, like WhatsApp: starts on the whole
// image, drag the corners to trim it.
export function ImageCropDialog({ file, onConfirm, onCancel }: ImageCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<PercentCrop>(FULL_IMAGE);
  const src = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const handleConfirm = () => {
    const image = imageRef.current;
    if (!image || crop.width === 0 || crop.height === 0) return;

    const sx = (crop.x / 100) * image.naturalWidth;
    const sy = (crop.y / 100) * image.naturalHeight;
    const sw = (crop.width / 100) * image.naturalWidth;
    const sh = (crop.height / 100) * image.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    canvas
      .getContext('2d')
      ?.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(new File([blob], 'producto.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.85,
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <ReactCrop crop={crop} onChange={(_, percent) => setCrop(percent)} keepSelection>
          <img
            ref={imageRef}
            src={src}
            alt="Recortar foto"
            className="max-h-[75vh] max-w-full object-contain"
          />
        </ReactCrop>
      </div>
      <div className="flex gap-2 p-4">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 flex-1 rounded-sm bg-white/10 text-sm text-white hover:bg-white/20"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setCrop(FULL_IMAGE)}
          className="min-h-12 flex-1 rounded-sm bg-white/10 text-sm text-white hover:bg-white/20"
        >
          Restablecer
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="min-h-12 flex-1 rounded-sm bg-white text-sm font-semibold text-black hover:bg-white/90"
        >
          Usar foto
        </button>
      </div>
    </div>,
    document.body,
  );
}
