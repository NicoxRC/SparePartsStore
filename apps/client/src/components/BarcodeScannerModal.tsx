import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { DecodeHintType, NotFoundException } from '@zxing/library';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BarcodeScannerModalProps {
  onScanned: (value: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ onScanned, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current!,
        (result, err, controls) => {
          if (controls) controlsRef.current = controls;
          if (result) {
            controls?.stop();
            onScanned(result.getText());
            onClose();
          } else if (err && !(err instanceof NotFoundException)) {
            setError('No se pudo acceder a la cámara. Revisa los permisos.');
          }
        },
      )
      .catch(() => {
        setError('No se pudo acceder a la cámara. Revisa los permisos.');
      });

    return () => {
      controlsRef.current?.stop();
    };
  }, [onScanned, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-lg">
        <div className="flex items-center justify-between bg-[#1E2A4A] px-4 py-3">
          <span className="text-sm font-semibold text-white">Escanear código de barras</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <span className="text-3xl">📷</span>
            <p className="text-sm text-white/80">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-72 rounded-lg border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          </div>
        )}

        <p className="px-4 py-3 text-center text-xs text-white/50">
          Apunta la cámara al código de barras
        </p>
      </div>
    </div>,
    document.body,
  );
}
