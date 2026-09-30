import { createPortal } from 'react-dom';
import { productImageThumbnail } from '../services/products';
import { IconClose } from './icons';

interface ProductImageViewerProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

// Full-screen photo, big enough to show a customer. Tapping anywhere closes it.
export function ProductImageViewer({ imageUrl, alt, onClose }: ProductImageViewerProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Cerrar"
      >
        <IconClose className="h-5 w-5" />
      </button>
      <img
        src={productImageThumbnail(imageUrl, 1600)}
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    </div>,
    document.body,
  );
}
